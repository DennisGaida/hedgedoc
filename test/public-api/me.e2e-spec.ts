/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { promises as fs } from 'fs';
import { join } from 'path';
import request from 'supertest';

import { HistoryEntryUpdateDto } from '../../src/history/history-entry-update.dto';
import { HistoryEntryDto } from '../../src/history/history-entry.dto';
import { NoteMetadataDto } from '../../src/notes/note-metadata.dto';
import { User } from '../../src/users/user.entity';
import { TestSetup } from '../test-setup';

// TODO Tests have to be reworked using UserService functions

describe('Me', () => {
  let testSetup: TestSetup;

  let uploadPath: string;
  let user: User;

  beforeAll(async () => {
    testSetup = await TestSetup.create();

    uploadPath =
      testSetup.configService.get('mediaConfig').backend.filesystem.uploadPath;

    user = await testSetup.userService.createUser('hardcoded', 'Testy');
    await testSetup.app.init();
  });

  it(`GET /me`, async () => {
    const userInfo = testSetup.userService.toUserDto(user);
    const response = await request(testSetup.app.getHttpServer())
      .get('/api/v2/me')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(response.body).toEqual(userInfo);
  });

  it(`GET /me/history`, async () => {
    const noteName = 'testGetNoteHistory1';
    const note = await testSetup.notesService.createNote('', null, noteName);
    const createdHistoryEntry =
      await testSetup.historyService.updateHistoryEntryTimestamp(note, user);
    const response = await request(testSetup.app.getHttpServer())
      .get('/api/v2/me/history')
      .expect('Content-Type', /json/)
      .expect(200);
    const history: HistoryEntryDto[] = response.body;
    expect(history.length).toEqual(1);
    const historyDto = await testSetup.historyService.toHistoryEntryDto(
      createdHistoryEntry,
    );
    for (const historyEntry of history) {
      expect(historyEntry.identifier).toEqual(historyDto.identifier);
      expect(historyEntry.title).toEqual(historyDto.title);
      expect(historyEntry.tags).toEqual(historyDto.tags);
      expect(historyEntry.pinStatus).toEqual(historyDto.pinStatus);
      expect(historyEntry.lastVisited).toEqual(
        historyDto.lastVisited.toISOString(),
      );
    }
  });

  describe(`GET /me/history/{note}`, () => {
    it('works with an existing note', async () => {
      const noteName = 'testGetNoteHistory2';
      const note = await testSetup.notesService.createNote('', null, noteName);
      const createdHistoryEntry =
        await testSetup.historyService.updateHistoryEntryTimestamp(note, user);
      const response = await request(testSetup.app.getHttpServer())
        .get(`/api/v2/me/history/${noteName}`)
        .expect('Content-Type', /json/)
        .expect(200);
      const historyEntry: HistoryEntryDto = response.body;
      const historyEntryDto = await testSetup.historyService.toHistoryEntryDto(
        createdHistoryEntry,
      );
      expect(historyEntry.identifier).toEqual(historyEntryDto.identifier);
      expect(historyEntry.title).toEqual(historyEntryDto.title);
      expect(historyEntry.tags).toEqual(historyEntryDto.tags);
      expect(historyEntry.pinStatus).toEqual(historyEntryDto.pinStatus);
      expect(historyEntry.lastVisited).toEqual(
        historyEntryDto.lastVisited.toISOString(),
      );
    });
    it('fails with a non-existing note', async () => {
      await request(testSetup.app.getHttpServer())
        .get('/api/v2/me/history/i_dont_exist')
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });

  describe(`PUT /me/history/{note}`, () => {
    it('works', async () => {
      const noteName = 'testGetNoteHistory3';
      const note = await testSetup.notesService.createNote('', null, noteName);
      await testSetup.historyService.updateHistoryEntryTimestamp(note, user);
      const historyEntryUpdateDto = new HistoryEntryUpdateDto();
      historyEntryUpdateDto.pinStatus = true;
      const response = await request(testSetup.app.getHttpServer())
        .put('/api/v2/me/history/' + noteName)
        .send(historyEntryUpdateDto)
        .expect(200);
      const history = await testSetup.historyService.getEntriesByUser(user);
      const historyEntry: HistoryEntryDto = response.body;
      expect(historyEntry.pinStatus).toEqual(true);
      let theEntry: HistoryEntryDto;
      for (const entry of history) {
        if (
          (await entry.note.aliases).find(
            (element) => element.name === noteName,
          )
        ) {
          theEntry = await testSetup.historyService.toHistoryEntryDto(entry);
        }
      }
      expect(theEntry.pinStatus).toEqual(true);
    });
    it('fails with a non-existing note', async () => {
      await request(testSetup.app.getHttpServer())
        .put('/api/v2/me/history/i_dont_exist')
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });

  describe(`DELETE /me/history/{note}`, () => {
    it('works', async () => {
      const noteName = 'testGetNoteHistory4';
      const note = await testSetup.notesService.createNote('', null, noteName);
      await testSetup.historyService.updateHistoryEntryTimestamp(note, user);
      const response = await request(testSetup.app.getHttpServer())
        .delete(`/api/v2/me/history/${noteName}`)
        .expect(204);
      expect(response.body).toEqual({});
      const history = await testSetup.historyService.getEntriesByUser(user);
      for (const entry of history) {
        if (
          (await entry.note.aliases).find(
            (element) => element.name === noteName,
          )
        ) {
          throw new Error('Deleted history entry still in history');
        }
      }
    });
    describe('fails', () => {
      it('with a non-existing note', async () => {
        await request(testSetup.app.getHttpServer())
          .delete('/api/v2/me/history/i_dont_exist')
          .expect(404);
      });
      it('with a non-existing history entry', async () => {
        const noteName = 'testGetNoteHistory5';
        await testSetup.notesService.createNote('', null, noteName);
        await request(testSetup.app.getHttpServer())
          .delete(`/api/v2/me/history/${noteName}`)
          .expect(404);
      });
    });
  });

  it(`GET /me/notes/`, async () => {
    const noteName = 'testNote';
    await testSetup.notesService.createNote('', user, noteName);
    const response = await request(testSetup.app.getHttpServer())
      .get('/api/v2/me/notes/')
      .expect('Content-Type', /json/)
      .expect(200);
    const noteMetaDtos = response.body as NoteMetadataDto[];
    expect(noteMetaDtos).toHaveLength(1);
    expect(noteMetaDtos[0].primaryAlias).toEqual(noteName);
    expect(noteMetaDtos[0].updateUser?.username).toEqual(user.username);
  });

  it('GET /me/media', async () => {
    const note1 = await testSetup.notesService.createNote(
      'This is a test note.',
      await testSetup.userService.getUserByUsername('hardcoded'),
      'test8',
    );
    const note2 = await testSetup.notesService.createNote(
      'This is a test note.',
      await testSetup.userService.getUserByUsername('hardcoded'),
      'test9',
    );
    const httpServer = testSetup.app.getHttpServer();
    const response1 = await request(httpServer)
      .get('/api/v2/me/media/')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(response1.body).toHaveLength(0);

    const testImage = await fs.readFile('test/public-api/fixtures/test.png');
    const url0 = await testSetup.mediaService.saveFile(testImage, user, note1);
    const url1 = await testSetup.mediaService.saveFile(testImage, user, note1);
    const url2 = await testSetup.mediaService.saveFile(testImage, user, note2);
    const url3 = await testSetup.mediaService.saveFile(testImage, user, note2);

    const response = await request(httpServer)
      .get('/api/v2/me/media/')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(response.body).toHaveLength(4);
    expect(response.body[0].url).toEqual(url0);
    expect(response.body[1].url).toEqual(url1);
    expect(response.body[2].url).toEqual(url2);
    expect(response.body[3].url).toEqual(url3);
    for (const fileUrl of [url0, url1, url2, url3]) {
      const fileName = fileUrl.replace('/uploads/', '');
      // delete the file afterwards
      await fs.unlink(join(uploadPath, fileName));
    }
    await fs.rmdir(uploadPath, { recursive: true });
  });

  afterAll(async () => {
    await testSetup.app.close();
  });
});
