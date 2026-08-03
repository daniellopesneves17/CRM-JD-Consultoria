// Gestão proprietária de contas, desempenho e disponibilidade do CRM.
import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AppError } from "../../utils/errors.js";

const analyze = (target:number,current:number,leads:number,qualified:number,closed:number) => {
  if (!target) return { status:"NO_DATA",label:"Sem meta",message:"Defina uma meta para iniciar a análise." };
  const expected=new Date().getDate()/new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  if(current/target>=expected*1.05)return{status:"ON_TRACK",label:"No ritmo",message:"Está acompanhando ou superando o ritmo necessário."};
  if(leads&&qualified/leads<.25)return{status:"DIFFICULTY",label:"Atenção",message:"Taxa de qualificação abaixo do esperado."};
  if(qualified&&closed/qualified<.15)return{status:"DIFFICULTY",label:"Atenção",message:"Conversão de qualificados em clientes está baixa."};
  return{status:"BEHIND",label:"Abaixo do ritmo",message:"O realizado está abaixo do ritmo da meta."};
};

const routes:FastifyPluginAsync=async(app)=>{
  app.addHook("preHandler",app.requireAdmin);
  app.get("/overview",async()=>{
    const now=new Date();
    const users=await app.prisma.user.findMany({where:{role:"CORRETOR"},include:{leads:{include:{proposals:true}},goals:{where:{month:now.getMonth()+1,year:now.getFullYear()}}}});
    const settings=await app.prisma.systemSettings.upsert({where:{id:"global"},update:{},create:{id:"global"}});
    return{settings,accounts:users.map(user=>{
      const leads=user.leads.length;const qualified=user.leads.filter(item=>!["NOVO","PERDIDO"].includes(item.stage)).length;const closed=user.leads.filter(item=>item.stage==="FECHADO").length;
      const revenue=user.leads.flatMap(item=>item.proposals).filter(item=>item.status==="ACEITA").reduce((sum,item)=>sum+Number(item.monthlyValue),0);const goal=user.goals[0];
      const metrics={leads,qualified,closed,revenue,target:Number(goal?.targetValue||0),current:Number(goal?.currentValue||0),averageTicket:closed?revenue/closed:0};
      return{id:user.id,name:user.name,email:user.email,role:user.role,active:user.active,crmEnabled:user.crmEnabled,createdAt:user.createdAt,lastLoginAt:user.lastLoginAt,metrics,insight:analyze(metrics.target,metrics.current,leads,qualified,closed)};
    })};
  });
  app.post("/accounts",async(request,reply)=>{
    const body=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8),target:z.number().min(0).default(0)}).parse(request.body);
    if(await app.prisma.user.findUnique({where:{email:body.email.toLowerCase()}}))throw new AppError("Já existe uma conta com este e-mail.",409);
    const user=await app.prisma.user.create({data:{name:body.name,email:body.email.toLowerCase(),passwordHash:await bcrypt.hash(body.password,12),role:"CORRETOR"}});
    if(body.target){const now=new Date();await app.prisma.goal.create({data:{userId:user.id,month:now.getMonth()+1,year:now.getFullYear(),targetValue:body.target}})}
    return reply.code(201).send({id:user.id});
  });
  app.patch("/accounts/:id",async(request)=>{
    const{id}=z.object({id:z.string()}).parse(request.params);const body=z.object({active:z.boolean().optional(),crmEnabled:z.boolean().optional(),target:z.number().min(0).optional(),password:z.string().min(8).optional()}).parse(request.body);
    if(!await app.prisma.user.findFirst({where:{id,role:"CORRETOR"}}))throw new AppError("Corretor não encontrado.",404);
    await app.prisma.user.update({where:{id},data:{active:body.active,crmEnabled:body.crmEnabled,passwordHash:body.password?await bcrypt.hash(body.password,12):undefined}});
    if(body.target!==undefined){const now=new Date();await app.prisma.goal.upsert({where:{userId_month_year:{userId:id,month:now.getMonth()+1,year:now.getFullYear()}},update:{targetValue:body.target},create:{userId:id,month:now.getMonth()+1,year:now.getFullYear(),targetValue:body.target}})}
    return{success:true};
  });
  app.delete("/accounts/:id",async(request,reply)=>{const{id}=z.object({id:z.string()}).parse(request.params);if(!await app.prisma.user.findFirst({where:{id,role:"CORRETOR"}}))throw new AppError("Corretor não encontrado.",404);await app.prisma.user.delete({where:{id}});return reply.code(204).send();});
  app.patch("/settings",async(request)=>{const body=z.object({crmEnabled:z.boolean().optional(),updatePolicy:z.enum(["AUTOMATIC","ON_COMPLETION"]).optional(),maintenanceMessage:z.string().min(3).max(240).optional()}).parse(request.body);return app.prisma.systemSettings.upsert({where:{id:"global"},update:body,create:{id:"global",...body}});});
};
export default routes;
