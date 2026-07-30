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
  Button,
  Card,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import {
  AutoClassificationConfig,
  ConflictResolution,
} from '../../../generated/entity/classification/classification';
import { getPopupContainer } from '../../../utils/formPureUtils';

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

interface AutoClassificationConfigCardProps {
  config?: AutoClassificationConfig;
  hasEditPermission: boolean;
  onUpdate: (config: AutoClassificationConfig) => void;
}

const AutoClassificationConfigCard = ({
  config,
  hasEditPermission,
  onUpdate,
}: AutoClassificationConfigCardProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<Required<AutoClassificationConfig>>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const effectiveConfig: Required<AutoClassificationConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const conflictResolutionOptions = Object.values(ConflictResolution).map(
    (value) => ({
      value,
      label: t(CONFLICT_RESOLUTION_LABEL_KEYS[value]),
    })
  );

  const handleEditClick = () => {
    form.setFieldsValue(effectiveConfig);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = (values: Required<AutoClassificationConfig>) => {
    onUpdate(values);
    setIsModalOpen(false);
  };

  return (
    <Card data-testid="auto-classification-config-card" size="small">
      <div className="d-flex justify-between items-center m-b-sm">
        <Typography.Text strong>
          {t('label.auto-classification')}
        </Typography.Text>
        {hasEditPermission && (
          <Button
            className="cursor-pointer p-0"
            data-testid="edit-auto-classification-config-button"
            size="small"
            type="text"
            onClick={handleEditClick}>
            <EditIcon width={16} />
          </Button>
        )}
      </div>

      <Space direction="vertical" size={4}>
        <Typography.Text data-testid="auto-classification-enabled-value">
          {`${t('label.enabled')}: ${
            effectiveConfig.enabled ? t('label.yes') : t('label.no')
          }`}
        </Typography.Text>
        <Typography.Text data-testid="auto-classification-conflict-resolution-value">
          {`${t('label.conflict-resolution')}: ${t(
            CONFLICT_RESOLUTION_LABEL_KEYS[effectiveConfig.conflictResolution]
          )}`}
        </Typography.Text>
        <Typography.Text data-testid="auto-classification-minimum-confidence-value">
          {`${t('label.minimum-confidence')}: ${
            effectiveConfig.minimumConfidence
          }`}
        </Typography.Text>
        <Typography.Text data-testid="auto-classification-require-explicit-match-value">
          {`${t('label.require-explicit-match')}: ${
            effectiveConfig.requireExplicitMatch
              ? t('label.yes')
              : t('label.no')
          }`}
        </Typography.Text>
      </Space>

      <Modal
        destroyOnClose
        cancelText={t('label.cancel')}
        data-testid="auto-classification-config-modal"
        okText={t('label.save')}
        open={isModalOpen}
        title={t('label.edit-entity', {
          entity: t('label.auto-classification'),
        })}
        onCancel={handleCancel}
        onOk={() => form.submit()}>
        <Form
          form={form}
          initialValues={effectiveConfig}
          layout="vertical"
          onFinish={handleSubmit}>
          <Form.Item
            label={t('label.enabled')}
            name="enabled"
            valuePropName="checked">
            <Switch data-testid="auto-classification-enabled-switch" />
          </Form.Item>

          <Form.Item
            label={t('label.conflict-resolution')}
            name="conflictResolution">
            <Select
              data-testid="auto-classification-conflict-resolution-select"
              getPopupContainer={getPopupContainer}
              options={conflictResolutionOptions}
            />
          </Form.Item>

          <Form.Item
            label={t('label.minimum-confidence')}
            name="minimumConfidence">
            <InputNumber
              data-testid="auto-classification-minimum-confidence-input"
              max={1}
              min={0}
              step={0.05}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label={t('label.require-explicit-match')}
            name="requireExplicitMatch"
            valuePropName="checked">
            <Switch data-testid="auto-classification-require-explicit-match-switch" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AutoClassificationConfigCard;
