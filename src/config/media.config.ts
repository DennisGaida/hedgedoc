/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

import { BackendType } from '../media/backends/backend-type.enum';
import { buildErrorMessage } from './utils';

export interface MediaConfig {
  backend: {
    use: BackendType;
    filesystem: {
      uploadPath: string;
    };
    s3: {
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
      endPoint: string;
    };
    azure: {
      connectionString: string;
      container: string;
    };
    imgur: {
      clientID: string;
    };
    webdav: {
      connectionString: string;
      uploadDir: string;
      publicUrl: string;
    };
  };
}

const mediaSchema = Joi.object({
  backend: {
    use: Joi.string()
      .valid(...Object.values(BackendType))
      .label('HD_MEDIA_BACKEND'),
    filesystem: {
      uploadPath: Joi.when('...use', {
        is: Joi.valid(BackendType.FILESYSTEM),
        then: Joi.string(),
        otherwise: Joi.optional(),
      }).label('HD_MEDIA_BACKEND_FILESYSTEM_UPLOAD_PATH'),
    },
    s3: Joi.when('use', {
      is: Joi.valid(BackendType.S3),
      then: Joi.object({
        accessKey: Joi.string().label('HD_MEDIA_BACKEND_S3_ACCESS_KEY'),
        secretKey: Joi.string().label('HD_MEDIA_BACKEND_S3_SECRET_KEY'),
        bucket: Joi.string().label('HD_MEDIA_BACKEND_S3_BUCKET'),
        endPoint: Joi.string().label('HD_MEDIA_BACKEND_S3_ENDPOINT'),
      }),
      otherwise: Joi.optional(),
    }),
    azure: Joi.when('use', {
      is: Joi.valid(BackendType.AZURE),
      then: Joi.object({
        connectionString: Joi.string().label(
          'HD_MEDIA_BACKEND_AZURE_CONNECTION_STRING',
        ),
        container: Joi.string().label('HD_MEDIA_BACKEND_AZURE_CONTAINER'),
      }),
      otherwise: Joi.optional(),
    }),
    imgur: Joi.when('use', {
      is: Joi.valid(BackendType.IMGUR),
      then: Joi.object({
        clientID: Joi.string().label('HD_MEDIA_BACKEND_IMGUR_CLIENT_ID'),
      }),
      otherwise: Joi.optional(),
    }),
    webdav: Joi.when('use', {
      is: Joi.valid(BackendType.WEBDAV),
      then: Joi.object({
        connectionString: Joi.string()
          .uri()
          .label('HD_MEDIA_BACKEND_WEBDAV_CONNECTION_STRING'),
        uploadDir: Joi.string()
          .optional()
          .label('HD_MEDIA_BACKEND_WEBDAV_UPLOAD_DIR'),
        publicUrl: Joi.string()
          .uri()
          .label('HD_MEDIA_BACKEND_WEBDAV_PUBLIC_URL'),
      }),
      otherwise: Joi.optional(),
    }),
  },
});

export default registerAs('mediaConfig', () => {
  const mediaConfig = mediaSchema.validate(
    {
      backend: {
        use: process.env.HD_MEDIA_BACKEND,
        filesystem: {
          uploadPath: process.env.HD_MEDIA_BACKEND_FILESYSTEM_UPLOAD_PATH,
        },
        s3: {
          accessKey: process.env.HD_MEDIA_BACKEND_S3_ACCESS_KEY,
          secretKey: process.env.HD_MEDIA_BACKEND_S3_SECRET_KEY,
          bucket: process.env.HD_MEDIA_BACKEND_S3_BUCKET,
          endPoint: process.env.HD_MEDIA_BACKEND_S3_ENDPOINT,
        },
        azure: {
          connectionString:
            process.env.HD_MEDIA_BACKEND_AZURE_CONNECTION_STRING,
          container: process.env.HD_MEDIA_BACKEND_AZURE_CONTAINER,
        },
        imgur: {
          clientID: process.env.HD_MEDIA_BACKEND_IMGUR_CLIENT_ID,
        },
        webdav: {
          connectionString:
            process.env.HD_MEDIA_BACKEND_WEBDAV_CONNECTION_STRING,
          uploadDir: process.env.HD_MEDIA_BACKEND_WEBDAV_UPLOAD_DIR,
          publicUrl: process.env.HD_MEDIA_BACKEND_WEBDAV_PUBLIC_URL,
        },
      },
    },
    {
      abortEarly: false,
      presence: 'required',
    },
  );
  if (mediaConfig.error) {
    const errorMessages = mediaConfig.error.details.map(
      (detail) => detail.message,
    );
    throw new Error(buildErrorMessage(errorMessages));
  }
  return mediaConfig.value as MediaConfig;
});
