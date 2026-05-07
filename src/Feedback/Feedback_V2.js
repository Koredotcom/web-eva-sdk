import store from '../redux/store';
import { Feedback_V2Thunk } from '../redux/actions/global.action';

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/**
 * PUT `kora/boards/{boardId}/messages/{messageId}/feedback` (auth + base URL from SDK config).
 *
 * @param {object} payload
 * @param {string} payload.boardId
 * @param {string} payload.messageId
 * @param {string} [payload.cId] Optional question key in `state.questions`; not sent to API. Improves store merge.
 * @param {'like'|'dislike'} [payload.feedback] With category, comment, attachments (omit undo).
 * @param {string[]} [payload.category]
 * @param {string} [payload.comment]
 * @param {{ id: string, name: string, type: string, size?: number }[]} [payload.attachments] Max 5 items; if `size` (bytes) is set per item, must not exceed 5 MiB.
 * @param {'undo'} [payload.action] Send `{ action: 'undo' }` only (same thumbs tap again).
 * @returns {Promise<unknown>} Response body (`response.data`).
 */
export async function feedback_V2(payload) {
  const { boardId, messageId, cId, ...body } = payload || {};

  if (!boardId || typeof boardId !== 'string') {
    throw Object.assign(new Error('boardId is required.'), {
      code: 'FEEDBACK_V2_VALIDATION',
    });
  }
  if (!messageId || typeof messageId !== 'string') {
    throw Object.assign(new Error('messageId is required.'), {
      code: 'FEEDBACK_V2_VALIDATION',
    });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('Invalid payload: request body must be an object.'), {
      code: 'FEEDBACK_V2_VALIDATION',
    });
  }

  if (body.action === 'undo') {
    const extra = Object.keys(body).filter(k => k !== 'action');
    if (extra.length > 0) {
      throw Object.assign(
        new Error('Undo payload must only include { action: "undo" }.'),
        { code: 'FEEDBACK_V2_VALIDATION' },
      );
    }
  } else {
    const attachments = body.attachments;
    if (attachments !== undefined && attachments !== null) {
      if (!Array.isArray(attachments)) {
        throw Object.assign(new Error('attachments must be an array.'), {
          code: 'FEEDBACK_V2_VALIDATION',
        });
      }
      if (attachments.length > MAX_ATTACHMENTS) {
        throw Object.assign(
          new Error(`attachments: at most ${MAX_ATTACHMENTS} allowed.`),
          { code: 'FEEDBACK_V2_VALIDATION' },
        );
      }
      attachments.forEach((att, index) => {
        if (
          att &&
          typeof att === 'object' &&
          typeof att.size === 'number' &&
          att.size > MAX_ATTACHMENT_BYTES
        ) {
          throw Object.assign(
            new Error(
              `attachments[${index}]: size must not exceed ${MAX_ATTACHMENT_BYTES} bytes (5 MB).`,
            ),
            { code: 'FEEDBACK_V2_VALIDATION' },
          );
        }
      });
    }
  }

  return store
    .dispatch(
      Feedback_V2Thunk({
        boardId,
        messageId,
        body,
        cId,
      }),
    )
    .unwrap();
}
