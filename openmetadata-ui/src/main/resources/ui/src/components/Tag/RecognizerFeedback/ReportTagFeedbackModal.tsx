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
  Dialog,
  FormField,
  HookForm,
  Modal,
  ModalOverlay,
  Select,
  SelectItem,
  TextArea,
  Typography,
} from '@openmetadata/ui-core-components';
import { AxiosError } from 'axios';
import { debounce } from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FeedbackType,
  RecognizerFeedback,
  UserReason,
} from '../../../generated/type/recognizerFeedback';
import { postRecognizerFeedback } from '../../../rest/tagAPI';
import {
  getNameFromFQN,
  getTableFQNFromColumnFQN,
} from '../../../utils/CommonUtils';
import EntityLink from '../../../utils/EntityLink';
import tagClassBase from '../../../utils/TagClassBase';
import { showErrorToast, showSuccessToast } from '../../../utils/ToastUtils';
import { ReportTagFeedbackModalProps } from './ReportTagFeedbackModal.interface';

interface SelectOption {
  id: string;
  label: string;
}

interface FeedbackFormValues {
  feedbackType: FeedbackType | '';
  userReason: UserReason | '';
  userComments: string;
  suggestedTag: string;
}

const FORM_DEFAULT_VALUES: FeedbackFormValues = {
  feedbackType: '',
  userReason: '',
  userComments: '',
  suggestedTag: '',
};

const ReportTagFeedbackModal = ({
  tagLabel,
  entityFqn,
  onCancel,
  onSubmitted,
}: ReportTagFeedbackModalProps) => {
  const { t } = useTranslation();
  const form = useForm<FeedbackFormValues>({
    defaultValues: FORM_DEFAULT_VALUES,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagOptions, setTagOptions] = useState<SelectOption[]>([]);

  const tableFqn = getTableFQNFromColumnFQN(entityFqn);
  const columnName = EntityLink.getTableColumnNameFromColumnFqn(
    entityFqn,
    false
  );
  const columnDisplayName = `${getNameFromFQN(tableFqn)}.${columnName}`;
  const tagDisplayName = getNameFromFQN(tagLabel.tagFQN);

  const feedbackTypeOptions: SelectOption[] = [
    {
      id: FeedbackType.FalsePositive,
      label: t('label.feedback-type-false-positive'),
    },
    {
      id: FeedbackType.IncorrectClassification,
      label: t('label.feedback-type-incorrect-classification'),
    },
    {
      id: FeedbackType.OverlyBroad,
      label: t('label.feedback-type-overly-broad'),
    },
    {
      id: FeedbackType.ContextSpecific,
      label: t('label.feedback-type-context-specific'),
    },
  ];

  const userReasonOptions: SelectOption[] = [
    {
      id: UserReason.NotSensitiveData,
      label: t('label.user-reason-not-sensitive-data'),
    },
    {
      id: UserReason.WrongDataType,
      label: t('label.user-reason-wrong-data-type'),
    },
    {
      id: UserReason.InternalIdentifier,
      label: t('label.user-reason-internal-identifier'),
    },
    {
      id: UserReason.PublicInformation,
      label: t('label.user-reason-public-information'),
    },
    { id: UserReason.TestData, label: t('label.user-reason-test-data') },
    {
      id: UserReason.EncryptedData,
      label: t('label.user-reason-encrypted-data'),
    },
    { id: UserReason.Other, label: t('label.user-reason-other') },
  ];

  const fetchTagOptions = useCallback(async (searchText = '') => {
    try {
      const response = await tagClassBase.getTags(searchText, 1, true);
      const options = (response?.data ?? [])
        .map((option): SelectOption | null => {
          const tag = option.data as {
            fullyQualifiedName?: string;
            displayName?: string;
            name?: string;
          };

          return tag?.fullyQualifiedName
            ? {
                id: tag.fullyQualifiedName,
                label: tag.displayName || tag.name || tag.fullyQualifiedName,
              }
            : null;
        })
        .filter((opt): opt is SelectOption => opt !== null);

      setTagOptions(options);
    } catch {
      setTagOptions([]);
    }
  }, []);

  const debouncedTagSearch = useMemo(
    () => debounce((text: string) => void fetchTagOptions(text), 250),
    [fetchTagOptions]
  );

  const handleFormSubmit = async (values: FeedbackFormValues) => {
    if (!values.feedbackType) {
      form.setError('feedbackType', {
        message: t('label.field-required', {
          field: t('label.feedback-type'),
        }),
      });

      return;
    }
    if (!values.userReason) {
      form.setError('userReason', {
        message: t('label.field-required', { field: t('label.user-reason') }),
      });

      return;
    }

    const payload: RecognizerFeedback = {
      entityLink: EntityLink.getTableEntityLink(tableFqn, columnName),
      tagFQN: tagLabel.tagFQN,
      feedbackType: values.feedbackType,
      userReason: values.userReason,
      userComments: values.userComments || undefined,
      suggestedTag: values.suggestedTag || undefined,
    };

    setIsSubmitting(true);
    try {
      await postRecognizerFeedback(tagLabel.tagFQN, payload);
      showSuccessToast(t('message.feedback-submitted-successfully'));
      onSubmitted();
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset(FORM_DEFAULT_VALUES);
  };

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => !open && onCancel()}>
      <Modal>
        <Dialog showCloseButton width={600} onClose={onCancel}>
          <Dialog.Header title={t('label.report-incorrect-automated-tag')}>
            <Typography as="p" className="tw:text-secondary tw:mt-1">
              {t('message.report-tag-feedback-description')}
            </Typography>
          </Dialog.Header>
          <Dialog.Content>
            <div className="tw:grid tw:grid-cols-2 tw:gap-4">
              <div>
                <Typography as="p" className="tw:text-secondary">
                  {t('label.column-name')}
                </Typography>
                <div
                  className="tw:rounded-lg tw:border tw:border-secondary tw:bg-secondary tw:px-3 tw:py-2"
                  data-testid="report-tag-column-name">
                  {columnDisplayName}
                </div>
              </div>
              <div>
                <Typography as="p" className="tw:text-secondary">
                  {t('label.tag')}
                </Typography>
                <div
                  className="tw:rounded-lg tw:border tw:border-secondary tw:bg-secondary tw:px-3 tw:py-2"
                  data-testid="report-tag-tag-name">
                  {tagDisplayName}
                </div>
              </div>
            </div>

            <HookForm
              className="tw:flex tw:flex-col tw:gap-4"
              form={form}
              id="report-tag-feedback-form"
              onSubmit={form.handleSubmit(handleFormSubmit)}>
              <div className="tw:grid tw:grid-cols-2 tw:gap-4">
                <FormField control={form.control} name="feedbackType">
                  {({ field, fieldState }) => (
                    <Select
                      isRequired
                      data-testid="report-tag-feedback-type-select"
                      hint={fieldState.error?.message}
                      items={feedbackTypeOptions}
                      label={t('label.feedback-type')}
                      placeholder={t('label.select-field', {
                        field: t('label.feedback-type'),
                      })}
                      selectedKey={field.value || null}
                      onSelectionChange={(key) =>
                        field.onChange(key as FeedbackType)
                      }>
                      {(item) => (
                        <SelectItem id={item.id}>{item.label}</SelectItem>
                      )}
                    </Select>
                  )}
                </FormField>
                <FormField control={form.control} name="userReason">
                  {({ field, fieldState }) => (
                    <Select
                      isRequired
                      data-testid="report-tag-user-reason-select"
                      hint={fieldState.error?.message}
                      items={userReasonOptions}
                      label={t('label.user-reason')}
                      placeholder={t('label.select-field', {
                        field: t('label.user-reason'),
                      })}
                      selectedKey={field.value || null}
                      onSelectionChange={(key) =>
                        field.onChange(key as UserReason)
                      }>
                      {(item) => (
                        <SelectItem id={item.id}>{item.label}</SelectItem>
                      )}
                    </Select>
                  )}
                </FormField>
              </div>
              <FormField control={form.control} name="userComments">
                {({ field }) => (
                  <TextArea
                    data-testid="report-tag-comments-input"
                    label={t('label.comment')}
                    placeholder={t('message.report-tag-comment-placeholder')}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              </FormField>
              <FormField control={form.control} name="suggestedTag">
                {({ field }) => (
                  <Select.ComboBox
                    data-testid="report-tag-suggested-tag-select"
                    items={tagOptions}
                    label={t('label.suggested-tag')}
                    placeholder={t('label.select-field', {
                      field: t('label.suggested-tag'),
                    })}
                    selectedKey={field.value || null}
                    onFocus={() => void fetchTagOptions()}
                    onInputChange={(text) => debouncedTagSearch(text)}
                    onSelectionChange={(key) =>
                      field.onChange((key as string) ?? '')
                    }>
                    {(item) => (
                      <SelectItem id={item.id}>{item.label}</SelectItem>
                    )}
                  </Select.ComboBox>
                )}
              </FormField>
            </HookForm>
          </Dialog.Content>

          <Dialog.Footer>
            <Button
              color="secondary"
              data-testid="report-tag-reset-button"
              onClick={handleReset}>
              {t('label.reset')}
            </Button>
            <Button
              color="primary-destructive"
              data-testid="report-tag-remove-button"
              isLoading={isSubmitting}
              onClick={() => form.handleSubmit(handleFormSubmit)()}>
              {t('label.remove-tag')}
            </Button>
          </Dialog.Footer>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
};

export default ReportTagFeedbackModal;
