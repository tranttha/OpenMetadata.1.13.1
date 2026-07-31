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
  Card,
  Dialog,
  FieldProp,
  FieldTypes,
  getField,
  HookForm,
  Modal,
  ModalOverlay,
  Typography,
} from '@openmetadata/ui-core-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import {
  AutoClassificationConfig,
  ConflictResolution,
} from '../../../generated/entity/classification/classification';

const DEFAULT_CONFIG: Required<AutoClassificationConfig> = {
  enabled: false,
  conflictResolution: ConflictResolution.HighestConfidence,
  minimumConfidence: 0.6,
  requireExplicitMatch: true,
};

const CONFLICT_RESOLUTION_LABEL_KEYS: Record<ConflictResolution, string> = {
  [ConflictResolution.HighestConfidence]: 'label.highest-confidence',
  [ConflictResolution.HighestPriority]: 'label.highest-priority',
  [ConflictResolution.MostSpecific]: 'label.most-specific',
};

interface ConflictResolutionSelectItem {
  id: ConflictResolution;
  label: string;
}

interface AutoClassificationFormValues {
  enabled: boolean;
  conflictResolution: ConflictResolutionSelectItem | null;
  minimumConfidence: number;
  requireExplicitMatch: boolean;
}

interface AutoClassificationConfigCardProps {
  config?: AutoClassificationConfig;
  hasEditPermission: boolean;
  onUpdate: (config: AutoClassificationConfig) => void;
}

const buildFormValues = (
  config: Required<AutoClassificationConfig>,
  options: ConflictResolutionSelectItem[]
): AutoClassificationFormValues => ({
  enabled: config.enabled,
  conflictResolution:
    options.find((option) => option.id === config.conflictResolution) ?? null,
  minimumConfidence: config.minimumConfidence,
  requireExplicitMatch: config.requireExplicitMatch,
});

const AutoClassificationConfigCard = ({
  config,
  hasEditPermission,
  onUpdate,
}: AutoClassificationConfigCardProps) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const effectiveConfig: Required<AutoClassificationConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const conflictResolutionOptions: ConflictResolutionSelectItem[] =
    Object.values(ConflictResolution).map((value) => ({
      id: value,
      label: t(CONFLICT_RESOLUTION_LABEL_KEYS[value]),
    }));

  const form = useForm<AutoClassificationFormValues>({
    defaultValues: buildFormValues(effectiveConfig, conflictResolutionOptions),
  });

  const handleEditClick = () => {
    form.reset(buildFormValues(effectiveConfig, conflictResolutionOptions));
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = (values: AutoClassificationFormValues) => {
    onUpdate({
      enabled: values.enabled,
      conflictResolution:
        values.conflictResolution?.id ?? DEFAULT_CONFIG.conflictResolution,
      minimumConfidence: values.minimumConfidence,
      requireExplicitMatch: values.requireExplicitMatch,
    });
    setIsModalOpen(false);
  };

  const enabledField: FieldProp = {
    name: 'enabled',
    label: t('label.enabled'),
    id: 'root/enabled',
    type: FieldTypes.SWITCH,
    props: { 'data-testid': 'auto-classification-enabled-switch' },
  };

  const conflictResolutionField: FieldProp = {
    name: 'conflictResolution',
    label: t('label.conflict-resolution'),
    id: 'root/conflictResolution',
    type: FieldTypes.SELECT,
    props: {
      'data-testid': 'auto-classification-conflict-resolution-select',
      options: conflictResolutionOptions,
    },
  };

  const minimumConfidenceField: FieldProp = {
    name: 'minimumConfidence',
    label: t('label.minimum-confidence'),
    id: 'root/minimumConfidence',
    type: FieldTypes.NUMBER,
    props: {
      'data-testid': 'auto-classification-minimum-confidence-input',
    },
  };

  const requireExplicitMatchField: FieldProp = {
    name: 'requireExplicitMatch',
    label: t('label.require-explicit-match'),
    id: 'root/requireExplicitMatch',
    type: FieldTypes.SWITCH,
    props: {
      'data-testid': 'auto-classification-require-explicit-match-switch',
    },
  };

  return (
    <Card className="tw:p-3" data-testid="auto-classification-config-card">
      <Box align="center" className="tw:justify-between tw:mb-2">
        <Typography as="span" weight="semibold">
          {t('label.auto-classification')}
        </Typography>
        {hasEditPermission && (
          <Button
            className="tw:cursor-pointer tw:p-0"
            color="link-gray"
            data-testid="edit-auto-classification-config-button"
            size="sm"
            onClick={handleEditClick}>
            <EditIcon width={16} />
          </Button>
        )}
      </Box>

      <Box direction="col" gap={1}>
        <Typography as="p" data-testid="auto-classification-enabled-value">
          {`${t('label.enabled')}: ${
            effectiveConfig.enabled ? t('label.yes') : t('label.no')
          }`}
        </Typography>
        <Typography
          as="p"
          data-testid="auto-classification-conflict-resolution-value">
          {`${t('label.conflict-resolution')}: ${t(
            CONFLICT_RESOLUTION_LABEL_KEYS[effectiveConfig.conflictResolution]
          )}`}
        </Typography>
        <Typography
          as="p"
          data-testid="auto-classification-minimum-confidence-value">
          {`${t('label.minimum-confidence')}: ${
            effectiveConfig.minimumConfidence
          }`}
        </Typography>
        <Typography
          as="p"
          data-testid="auto-classification-require-explicit-match-value">
          {`${t('label.require-explicit-match')}: ${
            effectiveConfig.requireExplicitMatch
              ? t('label.yes')
              : t('label.no')
          }`}
        </Typography>
      </Box>

      <ModalOverlay
        isDismissable
        isOpen={isModalOpen}
        onOpenChange={(open) => !open && handleCancel()}>
        <Modal>
          <Dialog showCloseButton width={480} onClose={handleCancel}>
            <Dialog.Header
              title={t('label.edit-entity', {
                entity: t('label.auto-classification'),
              })}
            />
            <Dialog.Content>
              <HookForm form={form} onSubmit={form.handleSubmit(handleSubmit)}>
                {getField(enabledField)}
                {getField(conflictResolutionField)}
                {getField(minimumConfidenceField)}
                {getField(requireExplicitMatchField)}
              </HookForm>
            </Dialog.Content>
            <Dialog.Footer>
              <Button color="secondary" onClick={handleCancel}>
                {t('label.cancel')}
              </Button>
              <Button
                color="primary"
                data-testid="auto-classification-modal-save"
                onClick={() => form.handleSubmit(handleSubmit)()}>
                {t('label.save')}
              </Button>
            </Dialog.Footer>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </Card>
  );
};

export default AutoClassificationConfigCard;
