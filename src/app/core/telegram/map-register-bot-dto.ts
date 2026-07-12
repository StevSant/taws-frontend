import { RegisterBotDto } from './register-bot-dto';
import { RegisterBotResponse } from './register-bot-response.model';

export function mapRegisterBotDto(dto: RegisterBotDto): RegisterBotResponse {
  return {
    botId: dto.bot_id,
    botUsername: dto.bot_username,
    chatId: dto.chat_id,
    status: dto.status,
  };
}
