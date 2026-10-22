# Aplicativo Android — JD Consultoria

Este diretório contém o projeto Android gerado pelo Bubblewrap para abrir o App JD como uma Trusted Web Activity verificada.

## Identidade

- Nome: `JD Consultoria`
- Pacote: `br.com.jdconsultoria.app`
- URL inicial: `https://crm-jd-consultoria.vercel.app/app?platform=android`
- Android mínimo: 7.0 (API 24)

## Gerar uma nova versão

1. Atualize `appVersionName` e `appVersionCode` em `twa-manifest.json`.
2. Execute `npx --yes @bubblewrap/cli@1.27.0 update`.
3. Execute `npx --yes @bubblewrap/cli@1.27.0 build`.
4. Copie `app-release-signed.apk` para `frontend/public/downloads/app-jd-android.apk`.
5. Confirme que o fingerprint da assinatura continua presente em `frontend/public/.well-known/assetlinks.json`.

A chave e a senha de assinatura ficam fora do repositório. Preserve ambas: futuras atualizações do mesmo aplicativo precisam ser assinadas com a mesma chave.
