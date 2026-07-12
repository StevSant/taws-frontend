import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import { Note, NoteRepository } from '../domain';
import { mapNoteDto } from './map-note-dto';
import { NoteBodyRequestDto, NoteDto } from './note-dto';

const NOTES_PATH = '/api/v1/notes';

@Injectable()
export class HttpNoteRepository extends NoteRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async list(): Promise<Note[]> {
    const dtos = await firstValueFrom(
      this.http.get<NoteDto[]>(`${this.config.apiBaseUrl}${NOTES_PATH}`),
    );
    return dtos.map(mapNoteDto);
  }

  async create(body: string): Promise<Note> {
    const payload: NoteBodyRequestDto = { body };
    const dto = await firstValueFrom(
      this.http.post<NoteDto>(`${this.config.apiBaseUrl}${NOTES_PATH}`, payload),
    );
    return mapNoteDto(dto);
  }

  async update(id: string, body: string): Promise<Note> {
    const payload: NoteBodyRequestDto = { body };
    const dto = await firstValueFrom(
      this.http.patch<NoteDto>(`${this.config.apiBaseUrl}${NOTES_PATH}/${id}`, payload),
    );
    return mapNoteDto(dto);
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.config.apiBaseUrl}${NOTES_PATH}/${id}`));
  }
}
