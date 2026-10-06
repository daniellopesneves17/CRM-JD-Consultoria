import assert from "node:assert/strict";
import test from "node:test";
import { getResponseText } from "@/services/ai/client";

test("usa o texto agregado retornado pela OpenAI", () => {
  assert.equal(getResponseText({ output_text: " resposta direta " }), "resposta direta");
});

test("reconstrói o texto quando a OpenRouter não envia output_text agregado", () => {
  assert.equal(getResponseText({
    output_text: null,
    output: [{
      type: "message",
      content: [
        { type: "output_text", text: "primeira parte" },
        { type: "output_text", text: "segunda parte" },
      ],
    }],
  }), "primeira parte\n\nsegunda parte");
});
