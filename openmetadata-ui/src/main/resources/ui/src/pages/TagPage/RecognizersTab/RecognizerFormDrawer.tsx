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
  FieldProp,
  FieldTypes,
  getField,
  HelperTextType,
  HookForm,
} from '@openmetadata/ui-core-components';
import { Plus, Trash01 } from '@untitledui/icons';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useFormDrawerWithHook } from '../../../components/common/atoms/drawer/useFormDrawer';
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

interface TargetSelectItem {
  id: Target;
  label: string;
}

interface RecognizerTypeSelectItem {
  id: RecognizerType;
  label: string;
}

interface RecognizerFormValues {
  name: string;
  displayName: string;
  target: TargetSelectItem | null;
  confidenceThreshold: number;
  recognizerType: RecognizerTypeSelectItem | null;
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
    target: recognizer?.target
      ? { id: recognizer.target, label: recognizer.target }
      : null,
    confidenceThreshold: recognizer?.confidenceThreshold ?? 0.5,
    recognizerType: { id: recognizerType, label: recognizerType },
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
  const recognizerType = values.recognizerType?.id ?? PATTERN_RECOGNIZER_TYPE;
  const isExactTerms = recognizerType === EXACT_TERMS_RECOGNIZER_TYPE;
  const regexFlags = {
    dotAll: values.dotAll,
    ignoreCase: values.ignoreCase,
    multiline: values.multiline,
  };

  return {
    ...recognizer,
    name: values.name,
    displayName: values.displayName || undefined,
    target: values.target?.id as Target,
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
    useWatch({ control: form.control, name: 'recognizerType' })?.id ??
    PATTERN_RECOGNIZER_TYPE;
  const isExactTerms = recognizerType === EXACT_TERMS_RECOGNIZER_TYPE;

  const targetOptions: TargetSelectItem[] = [
    { id: Target.Content, label: t('label.target-content') },
    { id: Target.ColumnName, label: t('label.target-column-name') },
  ];

  const recognizerTypeOptions: RecognizerTypeSelectItem[] = [
    { id: PATTERN_RECOGNIZER_TYPE, label: t('label.pattern') },
    { id: EXACT_TERMS_RECOGNIZER_TYPE, label: t('label.exact-term-plural') },
  ];

  const handleFormSubmit = (values: RecognizerFormValues) =>
    onSubmit(buildRecognizerPayload(values, recognizer));

  const nameField: FieldProp = {
    name: 'name',
    label: t('label.name'),
    id: 'root/name',
    type: FieldTypes.TEXT,
    required: true,
    rules: { required: t('label.field-required', { field: t('label.name') }) },
    props: { 'data-testid': 'recognizer-name-input' },
  };

  const displayNameField: FieldProp = {
    name: 'displayName',
    label: t('label.display-name'),
    id: 'root/displayName',
    type: FieldTypes.TEXT,
    props: { 'data-testid': 'recognizer-display-name-input' },
  };

  const targetField: FieldProp = {
    name: 'target',
    label: t('label.target'),
    id: 'root/target',
    type: FieldTypes.SELECT,
    required: true,
    rules: {
      required: t('label.field-required', { field: t('label.target') }),
    },
    props: {
      'data-testid': 'recognizer-target-select',
      options: targetOptions,
    },
  };

  const confidenceThresholdField: FieldProp = {
    name: 'confidenceThreshold',
    label: t('label.confidence-threshold'),
    id: 'root/confidenceThreshold',
    type: FieldTypes.NUMBER,
    props: { 'data-testid': 'recognizer-confidence-threshold-input' },
  };

  const recognizerTypeField: FieldProp = {
    name: 'recognizerType',
    label: t('label.recognizer-type'),
    id: 'root/recognizerType',
    type: FieldTypes.SELECT,
    required: true,
    props: {
      'data-testid': 'recognizer-type-select',
      options: recognizerTypeOptions,
    },
  };

  const exactTermsField: FieldProp = {
    name: 'exactTerms',
    label: t('label.exact-term-plural'),
    id: 'root/exactTerms',
    type: FieldTypes.TEXTAREA,
    required: true,
    rules: {
      required: t('label.field-required', {
        field: t('label.exact-term-plural'),
      }),
    },
    helperText: t('message.comma-separated-values-hint'),
    helperTextType: HelperTextType.TOOLTIP,
    props: { 'data-testid': 'recognizer-exact-terms-input' },
  };

  const dotAllField: FieldProp = {
    name: 'dotAll',
    label: t('label.dot-all'),
    id: 'root/dotAll',
    type: FieldTypes.CHECKBOX,
    props: { 'data-testid': 'recognizer-dot-all-checkbox' },
  };

  const ignoreCaseField: FieldProp = {
    name: 'ignoreCase',
    label: t('label.ignore-case'),
    id: 'root/ignoreCase',
    type: FieldTypes.CHECKBOX,
    props: { 'data-testid': 'recognizer-ignore-case-checkbox' },
  };

  const multilineField: FieldProp = {
    name: 'multiline',
    label: t('label.multiline'),
    id: 'root/multiline',
    type: FieldTypes.CHECKBOX,
    props: { 'data-testid': 'recognizer-multiline-checkbox' },
  };

  const patternRows = patternFields.map((field, index) => {
    const patternNameField: FieldProp = {
      name: `patterns.${index}.name`,
      label: t('label.pattern-name'),
      id: `root/patterns/${index}/name`,
      type: FieldTypes.TEXT,
      required: true,
      rules: {
        required: t('label.field-required', {
          field: t('label.pattern-name'),
        }),
      },
      props: { 'data-testid': `recognizer-pattern-name-input-${index}` },
    };

    const patternRegexField: FieldProp = {
      name: `patterns.${index}.regex`,
      label: t('label.pattern-regex'),
      id: `root/patterns/${index}/regex`,
      type: FieldTypes.TEXT,
      required: true,
      rules: {
        required: t('label.field-required', {
          field: t('label.pattern-regex'),
        }),
      },
      props: { 'data-testid': `recognizer-pattern-regex-input-${index}` },
    };

    const patternScoreField: FieldProp = {
      name: `patterns.${index}.score`,
      label: t('label.pattern-score'),
      id: `root/patterns/${index}/score`,
      type: FieldTypes.NUMBER,
      props: { 'data-testid': `recognizer-pattern-score-input-${index}` },
    };

    return (
      <Box className="tw:flex tw:items-start tw:gap-2" key={field.id}>
        <Box className="tw:flex tw:flex-1 tw:flex-col tw:gap-2">
          {getField(patternNameField)}
          {getField(patternRegexField)}
          {getField(patternScoreField)}
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
    );
  });

  const { formDrawer } = useFormDrawerWithHook<RecognizerFormValues>({
    title: recognizer
      ? t('label.edit-entity', { entity: t('label.recognizer') })
      : t('label.add-entity', { entity: t('label.recognizer') }),
    hookForm: form,
    submitTestId: 'recognizer-form-submit-button',
    cancelTestId: 'recognizer-form-cancel-button',
    defaultOpen: true,
    onCancel,
    onClose: onCancel,
    form: (
      <HookForm form={form} onSubmit={form.handleSubmit(handleFormSubmit)}>
        {getField(nameField)}
        {getField(displayNameField)}
        {getField(targetField)}
        {getField(confidenceThresholdField)}
        {getField(recognizerTypeField)}
        {isExactTerms ? (
          getField(exactTermsField)
        ) : (
          <>
            {getField(dotAllField)}
            {getField(ignoreCaseField)}
            {getField(multilineField)}
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
    onSubmit: (data) => handleFormSubmit(data),
  });

  return formDrawer;
};

export default RecognizerFormDrawer;
