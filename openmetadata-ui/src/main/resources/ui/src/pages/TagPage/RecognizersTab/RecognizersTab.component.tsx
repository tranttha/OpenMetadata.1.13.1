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
  Box,
  Button,
  ButtonUtility,
  Table,
  Toggle,
  Typography,
} from '@openmetadata/ui-core-components';
import { Edit01, Plus, Trash01 } from '@untitledui/icons';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeleteModal from '../../../components/common/DeleteModal/DeleteModal';
import { usePermissionProvider } from '../../../context/PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../../../context/PermissionProvider/PermissionProvider.interface';
import { Operation } from '../../../generated/entity/policies/accessControl/rule';
import { Recognizer } from '../../../generated/type/recognizer';
import { patchTag } from '../../../rest/tagAPI';
import { getEntityName } from '../../../utils/EntityNameUtils';
import { checkPermission } from '../../../utils/PermissionsUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import RecognizerExceptionsModal from './RecognizerExceptionsModal';
import RecognizerFormDrawer from './RecognizerFormDrawer';
import { RecognizersTabProps } from './RecognizersTab.interface';

const RecognizersTab = ({ tag }: RecognizersTabProps) => {
  const { t } = useTranslation();
  const { permissions } = usePermissionProvider();

  const [recognizers, setRecognizers] = useState<Recognizer[]>(
    tag.recognizers ?? []
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecognizer, setEditingRecognizer] = useState<Recognizer>();
  const [viewingExceptionsRecognizer, setViewingExceptionsRecognizer] =
    useState<Recognizer>();
  const [deletingRecognizer, setDeletingRecognizer] = useState<Recognizer>();
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = checkPermission(
    Operation.EditAll,
    ResourceEntity.TAG,
    permissions
  );

  useEffect(() => {
    setRecognizers(tag.recognizers ?? []);
  }, [tag.recognizers]);

  const persistRecognizers = async (nextRecognizers: Recognizer[]) => {
    const patch = compare({ recognizers }, { recognizers: nextRecognizers });
    await patchTag(tag.id, patch);
    setRecognizers(nextRecognizers);
  };

  const handleToggleEnabled = async (
    recognizer: Recognizer,
    enabled: boolean
  ) => {
    const nextRecognizers = recognizers.map((item) =>
      item.id === recognizer.id ? { ...item, enabled } : item
    );

    try {
      await persistRecognizers(nextRecognizers);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleFormSubmit = async (recognizer: Recognizer) => {
    const nextRecognizers = editingRecognizer
      ? recognizers.map((item) =>
          item.id === editingRecognizer.id ? { ...item, ...recognizer } : item
        )
      : [...recognizers, recognizer];

    await persistRecognizers(nextRecognizers);
    setIsFormOpen(false);
    setEditingRecognizer(undefined);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecognizer) {
      return;
    }

    setIsDeleting(true);
    try {
      const nextRecognizers = recognizers.filter(
        (item) => item.id !== deletingRecognizer.id
      );
      await persistRecognizers(nextRecognizers);
      setDeletingRecognizer(undefined);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteException = async (
    recognizer: Recognizer,
    entityLink: string
  ) => {
    const nextExceptionList = (recognizer.exceptionList ?? []).filter(
      (exception) => exception.entityLink !== entityLink
    );
    const nextRecognizers = recognizers.map((item) =>
      item.id === recognizer.id
        ? { ...item, exceptionList: nextExceptionList }
        : item
    );

    await persistRecognizers(nextRecognizers);
    setViewingExceptionsRecognizer((current) =>
      current && current.id === recognizer.id
        ? { ...current, exceptionList: nextExceptionList }
        : current
    );
  };

  return (
    <Box className="tw:flex tw:flex-col tw:gap-4 tw:p-4">
      {canEdit && (
        <Box className="tw:flex tw:justify-end">
          <Button
            color="primary"
            data-testid="add-recognizer-button"
            iconLeading={Plus}
            onClick={() => {
              setEditingRecognizer(undefined);
              setIsFormOpen(true);
            }}>
            {t('label.add-entity', { entity: t('label.recognizer') })}
          </Button>
        </Box>
      )}

      <Table
        aria-label={t('label.recognizer-plural')}
        data-testid="recognizers-table">
        <Table.Header
          columns={[
            { id: 'name', name: t('label.name') },
            { id: 'target', name: t('label.target') },
            { id: 'enabled', name: t('label.enabled') },
            { id: 'exceptions', name: t('label.exception-plural') },
            { id: 'actions', name: t('label.action-plural') },
          ]}>
          {(column) => (
            <Table.Head id={column.id} key={column.id} label={column.name} />
          )}
        </Table.Header>
        <Table.Body
          items={recognizers}
          renderEmptyState={() => (
            <Typography as="p">
              {t('message.no-recognizers-configured')}
            </Typography>
          )}>
          {(item) => {
            const recognizer = item as Recognizer;
            const exceptionCount = (recognizer.exceptionList ?? []).length;

            return (
              <Table.Row id={recognizer.id} key={recognizer.id}>
                <Table.Cell>{getEntityName(recognizer)}</Table.Cell>
                <Table.Cell>{recognizer.target}</Table.Cell>
                <Table.Cell>
                  <Toggle
                    aria-label={t('label.enabled')}
                    data-testid={`recognizer-enabled-toggle-${recognizer.id}`}
                    isDisabled={!canEdit}
                    isSelected={Boolean(recognizer.enabled)}
                    onChange={(enabled) =>
                      handleToggleEnabled(recognizer, enabled)
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Button
                    color="link-color"
                    data-testid={`exceptions-count-${recognizer.id}`}
                    onClick={() => setViewingExceptionsRecognizer(recognizer)}>
                    {exceptionCount}
                  </Button>
                </Table.Cell>
                <Table.Cell>
                  <Box className="tw:flex tw:gap-2">
                    <ButtonUtility
                      color="tertiary"
                      data-testid={`edit-recognizer-${recognizer.id}`}
                      icon={<Edit01 height={16} width={16} />}
                      isDisabled={!canEdit}
                      onClick={() => {
                        setEditingRecognizer(recognizer);
                        setIsFormOpen(true);
                      }}
                    />
                    <ButtonUtility
                      color="tertiary"
                      data-testid={`delete-recognizer-${recognizer.id}`}
                      icon={<Trash01 height={16} width={16} />}
                      isDisabled={!canEdit}
                      onClick={() => setDeletingRecognizer(recognizer)}
                    />
                  </Box>
                </Table.Cell>
              </Table.Row>
            );
          }}
        </Table.Body>
      </Table>

      {isFormOpen && (
        <RecognizerFormDrawer
          recognizer={editingRecognizer}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingRecognizer(undefined);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {viewingExceptionsRecognizer && (
        <RecognizerExceptionsModal
          recognizer={viewingExceptionsRecognizer}
          onClose={() => setViewingExceptionsRecognizer(undefined)}
          onDeleteException={(entityLink) =>
            handleDeleteException(viewingExceptionsRecognizer, entityLink)
          }
        />
      )}

      <DeleteModal
        entityTitle={
          deletingRecognizer ? getEntityName(deletingRecognizer) : ''
        }
        isDeleting={isDeleting}
        message={t('message.delete-recognizer-confirmation')}
        open={Boolean(deletingRecognizer)}
        onCancel={() => setDeletingRecognizer(undefined)}
        onDelete={handleDeleteConfirm}
      />
    </Box>
  );
};

export default RecognizersTab;
