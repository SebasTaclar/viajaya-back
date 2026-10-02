import { Context, HttpRequest } from '@azure/functions';
import { getDocumentService } from '../src/shared/serviceProvider';
import { withAuthenticatedApiHandler } from '../src/shared/apiHandler';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { AuthenticatedUser } from '../src/shared/authMiddleware';
import { isClient } from '../src/shared/roleMiddleware';
import { UploadFile } from '../src/domain/entities/StoredFile';
import Busboy from 'busboy';

interface ParsedMultipartData {
  fields: Record<string, string>;
  files: UploadFile[];
}

function parseMultipartData(req: HttpRequest): Promise<ParsedMultipartData> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: UploadFile[] = [];

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'));
      return;
    }

    const busboy = Busboy({
      headers: { 'content-type': contentType },
      limits: { fileSize: 50 * 1024 * 1024, files: 5, fields: 5, fieldSize: 1024 },
    });

    busboy.on('field', (name: string, value: string) => {
      fields[name] = value;
    });

    busboy.on('file', (name: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      const chunks: Buffer[] = [];

      file.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        files.push({
          buffer,
          name: info.filename,
          type: info.mimeType,
        });
      });

      file.on('error', (err: Error) => {
        reject(err);
      });
    });

    busboy.on('finish', () => {
      resolve({ fields, files });
    });

    busboy.on('error', (error: Error) => {
      reject(error);
    });

    if (req.body) {
      if (Buffer.isBuffer(req.body)) {
        busboy.end(req.body);
      } else if (typeof req.body === 'string') {
        busboy.end(Buffer.from(req.body));
      } else if (typeof req.body === 'object') {
        const bodyObj = req.body as Record<string, unknown>;
        if (bodyObj.data && Buffer.isBuffer(bodyObj.data)) {
          busboy.end(bodyObj.data);
        } else {
          busboy.end(Buffer.from(JSON.stringify(req.body)));
        }
      } else {
        reject(new Error('Unsupported body type'));
      }
    } else {
      reject(new Error('No body provided'));
    }
  });
}

const funcDocuments = async (
  _context: Context,
  req: HttpRequest,
  logger: Logger,
  user: AuthenticatedUser
): Promise<unknown> => {
  const documentService = getDocumentService(logger);
  const method = req.method?.toUpperCase();
  const id = req.params.id ? parseInt(req.params.id, 10) : null;

  if (method === 'GET' && !id) {
    logger.info('GET /documents');
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId ? parseInt(req.query.entityId as string, 10) : null;

    if (entityType && entityId) {
      let documents = await documentService.getDocumentsByEntity(entityType, entityId);

      if (isClient(user)) {
        documents = documents.filter(d => d.isVisible);
      }

      return ApiResponseBuilder.success({ count: documents.length, documents }, 'Documents retrieved successfully');
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const result = await documentService.getAllDocuments(page, limit);

    if (isClient(user)) {
      result.documents = result.documents.filter(d => d.isVisible);
    }

    const totalPages = Math.ceil(result.total / limit);
    return ApiResponseBuilder.success(
      {
        count: result.documents.length,
        documents: result.documents,
        pagination: { page, limit, total: result.total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
      },
      'Documents retrieved successfully'
    );
  }

  if (method === 'GET' && id) {
    logger.info(`GET /documents/${id}`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid document ID');
    const doc = await documentService.getDocumentById(id);

    if (isClient(user) && !doc.isVisible) {
      return ApiResponseBuilder.error('Forbidden: This document is not visible', 403);
    }

    return ApiResponseBuilder.success(doc, 'Document retrieved successfully');
  }

  if (method === 'POST') {
    logger.info('POST /documents - Creating new document');

    let parsedData: ParsedMultipartData;
    try {
      parsedData = await parseMultipartData(req);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse multipart data';
      logger.logError(errorMessage);
      return ApiResponseBuilder.badRequest(errorMessage);
    }

    const { fields, files } = parsedData;

    const errors: string[] = [];
    if (files.length === 0) errors.push('At least one file is required');
    if (fields.entityType && !fields.entityId) errors.push('entityId is required when entityType is provided');
    if (errors.length > 0) return ApiResponseBuilder.validationError(errors);

    const doc = await documentService.createDocument(
      fields.entityType || undefined,
      fields.entityId ? parseInt(fields.entityId, 10) : undefined,
      files[0],
      user.email,
      fields.type
    );

    return { success: true, message: 'Document created successfully', data: doc, timestamp: new Date().toISOString(), statusCode: 201 };
  }

  if (method === 'PATCH' && id) {
    logger.info(`PATCH /documents/${id}`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid document ID');

    const body = req.body as Record<string, unknown>;
    const updateData: { name?: string; type?: string; isVisible?: boolean } = {};
    if (body.name !== undefined) updateData.name = body.name as string;
    if (body.type !== undefined) updateData.type = body.type as string;
    if (body.isVisible !== undefined) updateData.isVisible = body.isVisible === true || body.isVisible === 'true';

    if (Object.keys(updateData).length === 0) {
      return ApiResponseBuilder.badRequest('No valid fields to update. Allowed: name, type, isVisible');
    }

    const doc = await documentService.updateDocument(id, updateData);
    return ApiResponseBuilder.success(doc, 'Document updated successfully');
  }

  if (method === 'DELETE' && id) {
    logger.info(`DELETE /documents/${id}`);
    if (isNaN(id)) return ApiResponseBuilder.badRequest('Invalid document ID');
    await documentService.deleteDocument(id);
    return ApiResponseBuilder.success({ id }, 'Document deleted successfully');
  }

  return ApiResponseBuilder.methodNotAllowed(`Method ${method} not allowed for this endpoint`);
};

export default withAuthenticatedApiHandler(funcDocuments);
