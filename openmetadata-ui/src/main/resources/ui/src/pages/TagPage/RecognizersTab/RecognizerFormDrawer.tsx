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
  Checkbox,
  FormField,
  HookForm,
  Input,
  Select,
  SelectItem,
  TextArea,
} from '@openmetadata/ui-core-components';
import { Plus, Trash01 } from '@untitledui/icons';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useFormDrawer } from '../../../components/common/atoms/drawer/useFormDrawer';
import {
  ClassificationLanguage,
  Pattern,
  Recognizer,
  Target,
} from '../../../generated/type/recognizer';
import { RecognizerFormDrawerProps } from './RecognizerFormDrawer.interface';

type RecognizerType = 'pattern' | 'exact_terms';

const PATTERN_RECOGNIZER_TYPE: RecognizerType = 'pattern';
const EXACT_TERMS_RECOGNIZER_TYPE: RecognizerType = 'exact_terms';

interface SelectOption {
  id: string;
  label: string;
}

interface RecognizerFormValues {
  name: string;
  displayName: string;
  target: Target | '';
  confidenceThreshold: number;
  recognizerType: RecognizerType;
  patterns: Pattern[];
  exactTerms: string;
  dotAll: boolean;
  ignoreCase: boolean;
  multiline: boolean;
}

const DEFAULT_PATTERN: Pattern = { name: '', regex: '', score: 0.8 };

const getDefaultValues = (recognizer?: Recognizer): RecognizerFormValues => {
  const config = recognizer?.recognizerConfig;
  const recognizerType: RecognizerType =
    (config?.type as RecognizerType) ?? PATTERN_RECOGNIZER_TYPE;
  const isExactTerms = recognizerType === EXACT_TERMS_RECOGNIZER_TYPE;
  const regexFlags = config?.regexFlags;

  return {
    name: recognizer?.name ?? '',
    displayName: recognizer?.displayName ?? '',
    target: recognizer?.target ?? '',
    confidenceThreshold: recognizer?.confidenceThreshold ?? 0.5,
    recognizerType,
    patterns:
      !isExactTerms && config?.patterns && config.patterns.length > 0
        ? config.patterns
        : [DEFAULT_PATTERN],
    exactTerms:
      isExactTerms && config?.exactTerms ? config.exactTerms.join(', ') : '',
    dotAll: regexFlags?.dotAll ?? false,
    ignoreCase: regexFlags?.ignoreCase ?? false,
    multiline: regexFlags?.multiline ?? false,
  };
};

const parseCommaSeparatedList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const buildRecognizerPayload = (
  values: RecognizerFormValues,
  recognizer?: Recognizer
): Recognizer => {
  const isExactTerms = values.recognizerType === EXACT_TERMS_RECOGNIZER_TYPE;
  const regexFlags = {
    dotAll: values.dotAll,
    ignoreCase: values.ignoreCase,
    multiline: values.multiline,
  };

  return {
    ...recognizer,
    name: values.name,
    displayName: values.displayName || undefined,
    target: values.target as Target,
    confidenceThreshold: values.confidenceThreshold,
    enabled: recognizer?.enabled ?? true,
    recognizerConfig: isExactTerms
      ? {
          type: EXACT_TERMS_RECOGNIZER_TYPE,
          exactTerms: parseCommaSeparatedList(values.exactTerms),
          regexFlags,
          supportedLanguage: ClassificationLanguage.En,
        }
      : {
          type: PATTERN_RECOGNIZER_TYPE,
          patterns: values.patterns.filter(
            (pattern) => pattern.name && pattern.regex
          ),
          regexFlags,
          supportedLanguage: ClassificationLanguage.En,
          context: [],
        },
  };
};

const RecognizerFormDrawer = ({
  recognizer,
  onCancel,
  onSubmit,
}: RecognizerFormDrawerProps) => {
  const { t } = useTranslation();
  const form = useForm<RecognizerFormValues>({
    defaultValues: getDefaultValues(recognizer),
  });

  const {
    fields: patternFields,
    append: appendPattern,
    remove: removePattern,
  } = useFieldArray({ control: form.control, name: 'patterns' });

  const recognizerType =
    useWatch({ control: form.control, name: 'recognizerType' }) ??
    PATTERN_RECOGNIZER_TYPE;
  const isExactTerms = recognizerType === EXACT_TERMS_RECOGNIZER_TYPE;

  const targetOptions: SelectOption[] = [
    { id: Target.Content, label: t('label.target-content') },
    { id: Target.ColumnName, label: t('label.target-column-name') },
  ];

  const recognizerTypeOptions: SelectOption[] = [
    { id: PATTERN_RECOGNIZER_TYPE, label: t('label.pattern') },
    { id: EXACT_TERMS_RECOGNIZER_TYPE, label: t('label.exact-term-plural') },
  ];

  const handleFormSubmit = async (values: RecognizerFormValues) => {
    if (!values.name) {
      form.setError('name', {
        message: t('label.field-required', { field: t('label.name') }),
      });

      return;
    }
    if (!values.target) {
      form.setError('target', {
        message: t('label.field-required', { field: t('label.target') }),
      });

      return;
    }

    await onSubmit(buildRecognizerPayload(values, recognizer));
  };

  const patternRows = patternFields.map((patternField, index) => (
    <Box className="tw:flex tw:items-start tw:gap-2" key={patternField.id}>
      <Box className="tw:flex tw:flex-1 tw:flex-col tw:gap-2">
        <FormField control={form.control} name={`patterns.${index}.name`}>
          {({ field }) => (
            <Input
              isRequired
              data-testid={`recognizer-pattern-name-input-${index}`}
              label={t('label.pattern-name')}
              value={field.value}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        </FormField>
        <FormField control={form.control} name={`patterns.${index}.regex`}>
          {({ field }) => (
            <Input
              isRequired
              data-testid={`recognizer-pattern-regex-input-${index}`}
              label={t('label.pattern-regex')}
              value={field.value}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        </FormField>
        <FormField control={form.control} name={`patterns.${index}.score`}>
          {({ field }) => (
            <Input
              data-testid={`recognizer-pattern-score-input-${index}`}
              label={t('label.pattern-score')}
              type="number"
              value={String(field.value)}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange(Number(value))}
            />
          )}
        </FormField>
      </Box>
      {patternFields.length > 1 && (
        <ButtonUtility
          color="tertiary"
          data-testid={`remove-pattern-button-${index}`}
          icon={<Trash01 height={16} width={16} />}
          onClick={() => removePattern(index)}
        />
      )}
    </Box>
  ));

  const { formDrawer } = useFormDrawer<RecognizerFormValues>({
    title: recognizer
      ? t('label.edit-entity', { entity: t('label.recognizer') })
      : t('label.add-entity', { entity: t('label.recognizer') }),
    submitTestId: 'recognizer-form-submit-button',
    cancelTestId: 'recognizer-form-cancel-button',
    defaultOpen: true,
    onCancel,
    onClose: onCancel,
    onSubmit: () => form.handleSubmit(handleFormSubmit)(),
    form: (
      <HookForm form={form} onSubmit={form.handleSubmit(handleFormSubmit)}>
        <FormField control={form.control} name="name">
          {({ field }) => (
            <Input
              isRequired
              data-testid="recognizer-name-input"
              label={t('label.name')}
              value={field.value}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        </FormField>
        <FormField control={form.control} name="displayName">
          {({ field }) => (
            <Input
              data-testid="recognizer-display-name-input"
              label={t('label.display-name')}
              value={field.value}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        </FormField>
        <FormField control={form.control} name="target">
          {({ field }) => (
            <Select
              isRequired
              data-testid="recognizer-target-select"
              items={targetOptions}
              label={t('label.target')}
              selectedKey={field.value || null}
              onSelectionChange={(key) => field.onChange(key as Target)}>
              {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
            </Select>
          )}
        </FormField>
        <FormField control={form.control} name="confidenceThreshold">
          {({ field }) => (
            <Input
              data-testid="recognizer-confidence-threshold-input"
              label={t('label.confidence-threshold')}
              type="number"
              value={String(field.value)}
              onBlur={field.onBlur}
              onChange={(value) => field.onChange(Number(value))}
            />
          )}
        </FormField>
        <FormField control={form.control} name="recognizerType">
          {({ field }) => (
            <Select
              isRequired
              data-testid="recognizer-type-select"
              items={recognizerTypeOptions}
              label={t('label.recognizer-type')}
              selectedKey={field.value}
              onSelectionChange={(key) =>
                field.onChange(key as RecognizerType)
              }>
              {(item) => <SelectItem id={item.id}>{item.label}</SelectItem>}
            </Select>
          )}
        </FormField>
        {isExactTerms ? (
          <FormField control={form.control} name="exactTerms">
            {({ field }) => (
              <TextArea
                isRequired
                data-testid="recognizer-exact-terms-input"
                hint={t('message.comma-separated-values-hint')}
                label={t('label.exact-term-plural')}
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          </FormField>
        ) : (
          <>
            <FormField control={form.control} name="dotAll">
              {({ field }) => (
                <Checkbox
                  data-testid="recognizer-dot-all-checkbox"
                  isSelected={field.value}
                  label={t('label.dot-all')}
                  onChange={field.onChange}
                />
              )}
            </FormField>
            <FormField control={form.control} name="ignoreCase">
              {({ field }) => (
                <Checkbox
                  data-testid="recognizer-ignore-case-checkbox"
                  isSelected={field.value}
                  label={t('label.ignore-case')}
                  onChange={field.onChange}
                />
              )}
            </FormField>
            <FormField control={form.control} name="multiline">
              {({ field }) => (
                <Checkbox
                  data-testid="recognizer-multiline-checkbox"
                  isSelected={field.value}
                  label={t('label.multiline')}
                  onChange={field.onChange}
                />
              )}
            </FormField>
            <Box className="tw:flex tw:flex-col tw:gap-3">
              {patternRows}
              <Button
                color="secondary"
                data-testid="add-pattern-button"
                iconLeading={Plus}
                onClick={() => appendPattern({ ...DEFAULT_PATTERN })}>
                {t('label.add-entity', { entity: t('label.pattern-plural') })}
              </Button>
            </Box>
          </>
        )}
      </HookForm>
    ),
  });

  return formDrawer;
};

export default RecognizerFormDrawer;
