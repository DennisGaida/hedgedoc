/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Injectable } from '@nestjs/common';

import { SpecialGroup } from '../groups/groups.special';
import { Note } from '../notes/note.entity';
import { User } from '../users/user.entity';

// TODO move to config or remove
export enum GuestPermission {
  DENY = 'deny',
  READ = 'read',
  WRITE = 'write',
  CREATE = 'create',
  CREATE_ALIAS = 'createAlias',
}

@Injectable()
export class PermissionsService {
  public guestPermission: GuestPermission = GuestPermission.READ; // TODO change to configOption
  async mayRead(user: User | null, note: Note): Promise<boolean> {
    if (await this.isOwner(user, note)) return true;

    if (await this.hasPermissionUser(user, note, false)) return true;

    // noinspection RedundantIfStatementJS
    if (await this.hasPermissionGroup(user, note, false)) return true;

    return false;
  }

  async mayWrite(user: User | null, note: Note): Promise<boolean> {
    if (await this.isOwner(user, note)) return true;

    if (await this.hasPermissionUser(user, note, true)) return true;

    // noinspection RedundantIfStatementJS
    if (await this.hasPermissionGroup(user, note, true)) return true;

    return false;
  }

  mayCreate(user: User | null): boolean {
    if (user) {
      return true;
    } else {
      if (
        this.guestPermission == GuestPermission.CREATE ||
        this.guestPermission == GuestPermission.CREATE_ALIAS
      ) {
        // TODO change to guestPermission to config option
        return true;
      }
    }
    return false;
  }

  async isOwner(user: User | null, note: Note): Promise<boolean> {
    if (!user) return false;
    const owner = await note.owner;
    if (!owner) return false;
    return owner.id === user.id;
  }

  private async hasPermissionUser(
    user: User | null,
    note: Note,
    wantEdit: boolean,
  ): Promise<boolean> {
    if (!user) {
      return false;
    }
    for (const userPermission of await note.userPermissions) {
      if (
        userPermission.user.id === user.id &&
        (userPermission.canEdit || !wantEdit)
      ) {
        return true;
      }
    }
    return false;
  }

  private async hasPermissionGroup(
    user: User | null,
    note: Note,
    wantEdit: boolean,
  ): Promise<boolean> {
    // TODO: Get real config value
    let guestsAllowed = false;
    switch (this.guestPermission) {
      case GuestPermission.CREATE_ALIAS:
      case GuestPermission.CREATE:
      case GuestPermission.WRITE:
        guestsAllowed = true;
        break;
      case GuestPermission.READ:
        guestsAllowed = !wantEdit;
    }
    for (const groupPermission of await note.groupPermissions) {
      if (groupPermission.canEdit || !wantEdit) {
        // Handle special groups
        if (groupPermission.group.special) {
          if (groupPermission.group.name == SpecialGroup.LOGGED_IN) {
            return true;
          }
          if (
            groupPermission.group.name == SpecialGroup.EVERYONE &&
            (groupPermission.canEdit || !wantEdit) &&
            guestsAllowed
          ) {
            return true;
          }
        } else {
          // Handle normal groups
          if (user) {
            for (const member of await groupPermission.group.members) {
              if (member.id === user.id) return true;
            }
          }
        }
      }
    }
    return false;
  }
}
