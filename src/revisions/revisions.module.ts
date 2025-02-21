/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthorsModule } from '../authors/authors.module';
import { LoggerModule } from '../logger/logger.module';
import { NotesModule } from '../notes/notes.module';
import { Edit } from './edit.entity';
import { Revision } from './revision.entity';
import { RevisionsService } from './revisions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Revision, Edit]),
    forwardRef(() => NotesModule),
    LoggerModule,
    ConfigModule,
    AuthorsModule,
  ],
  providers: [RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
