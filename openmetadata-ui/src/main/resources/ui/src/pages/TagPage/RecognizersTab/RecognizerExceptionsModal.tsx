/*
 *  Copyright 2026 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {
  ButtonUtility,
  Dialog,
  Modal,
  ModalOverlay,
  Table,
  Typography,
} from '@openmetadata/ui-core-components';
import { Trash01 } from '@untitledui/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeleteModal from '../../../components/common/DeleteModal/DeleteModal';
import { RecognizerException } from '../../../generated/type/recognizer';
import { formatDateTime } from '../../../utils/date-time/DateTimeUtils';
import { getEntityName } from '../../../utils/EntityNameUtils';
import { RecognizerExceptionsModalProps } from './RecognizerExceptionsModal.interface';

const RecognizerExceptionsModal = ({
  recognizer,
  onClose,
  onDeleteException,
}: RecognizerExceptionsModalProps) => {
  const { t } = useTranslation();
  const exceptions = recognizer.exceptionList ?? [];
  const [pendingDeleteLink, setPendingDeleteLink] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteLink) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteException(pendingDeleteLink);
      setPendingDeleteLink(undefined);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => !open && onClose()}>
      <Modal>
        <Dialog showCloseButton width={720} onClose={onClose}>
          <Dialog.Header title={t('label.exception-plural')} />
          <Dialog.Content>
            <Table
              aria-label={t('label.exception-plural')}
              data-testid="recognizer-exceptions-table">
              <Table.Header
                columns={[
                  { id: 'entityLink', name: t('label.entity-link') },
                  { id: 'reason', name: t('label.reason') },
                  { id: 'addedBy', name: t('label.added-by') },
                  { id: 'addedAt', name: t('label.added-on') },
                  { id: 'actions', name: t('label.action-plural') },
                ]}>
                {(column) => (
                  <Table.Head
                    id={column.id}
                    key={column.id}
                    label={column.name}
                  />
                )}
              </Table.Header>
              <Table.Body
                items={exceptions}
                renderEmptyState={() => (
                  <Typography as="p">
                    {t('message.no-exceptions-configured')}
                  </Typography>
                )}>
                {(item) => {
                  const exception = item as RecognizerException;
                  const index = exceptions.indexOf(exception);

                  return (
                    <Table.Row
                      id={exception.entityLink}
                      key={exception.entityLink}>
                      <Table.Cell>{exception.entityLink}</Table.Cell>
                      <Table.Cell>{exception.reason ?? '--'}</Table.Cell>
                      <Table.Cell>
                        {exception.addedBy
                          ? getEntityName(exception.addedBy)
                          : '--'}
                      </Table.Cell>
                      <Table.Cell>
                        {exception.addedAt
                          ? formatDateTime(exception.addedAt)
                          : '--'}
                      </Table.Cell>
                      <Table.Cell>
                        <ButtonUtility
                          color="tertiary"
                          data-testid={`delete-exception-${index}`}
                          icon={<Trash01 height={16} width={16} />}
                          onClick={() =>
                            setPendingDeleteLink(exception.entityLink)
                          }
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                }}
              </Table.Body>
            </Table>
          </Dialog.Content>
        </Dialog>
      </Modal>

      <DeleteModal
        entityTitle={t('label.exception')}
        isDeleting={isDeleting}
        message={t('message.delete-exception-confirmation')}
        open={Boolean(pendingDeleteLink)}
        onCancel={() => setPendingDeleteLink(undefined)}
        onDelete={handleDeleteConfirm}
      />
    </ModalOverlay>
  );
};

export default RecognizerExceptionsModal;
