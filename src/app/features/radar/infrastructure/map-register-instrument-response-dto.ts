import { RegisterInstrumentResult } from '../domain';
import { mapInstrumentDto } from './map-instrument-dto';
import { RegisterInstrumentResponseDto } from './register-instrument-dto';

/** Maps a `RegisterInstrumentResponseDto` to the domain `RegisterInstrumentResult`. */
export function mapRegisterInstrumentResponseDto(
  dto: RegisterInstrumentResponseDto,
): RegisterInstrumentResult {
  return {
    instrument: mapInstrumentDto(dto.instrument),
    watchlisted: dto.watchlisted,
  };
}
