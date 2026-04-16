import { Vapi } from "@vapi-ai/server-sdk";

/**
 * TTS voice for assistants. ElevenLabs voiceId must be a real ID from your 11Labs library — names like "rachel" fail with
 * pipeline-error-eleven-labs-voice-not-found. Default: Vapi-hosted voice (no extra provider API keys).
 */
function resolveVapiVoiceId(): Vapi.VapiVoiceVoiceId {
  const env = process.env.VAPI_VAPI_VOICE_ID;
  if (env && env in Vapi.VapiVoiceVoiceId) {
    return Vapi.VapiVoiceVoiceId[env as keyof typeof Vapi.VapiVoiceVoiceId];
  }
  return Vapi.VapiVoiceVoiceId.Clara;
}

export function getAssistantVoice(): Vapi.CreateAssistantDtoVoice {
  const provider = process.env.VAPI_TTS_PROVIDER || "vapi";

  if (provider === "playht") {
    return {
      provider: "playht",
      voiceId: process.env.VAPI_PLAYHT_VOICE_ID || Vapi.PlayHtVoiceIdEnum.Jennifer
    };
  }

  return {
    provider: "vapi",
    voiceId: resolveVapiVoiceId()
  };
}
