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
  FieldProp,
  FieldTypes,
  getField,
  HookForm,
} from '@openmetadata/ui-core-components';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useFormDrawerWithHook } from '../../../components/common/atoms/drawer/useFormDrawer';
import { ClassificationLanguage } from '../../../generated/type/patternRecognizer';
import { Recognizer, Target } from '../../../generated/type/recognizer';
import { RecognizerFormDrawerProps } from './RecognizerFormDrawer.interface';

interface TargetSelectItem {
  id: Target;
  label: string;
}

interface RecognizerFormValues {
  name: string;
  displayName: string;
  target: TargetSelectItem | null;
  confidenceThreshold: number;
  patternName: string;
  patternRegex: string;
  patternScore: number;
  dotAll: boolean;
  ignoreCase: boolean;
  multiline: boolean;
}

const getDefaultValues = (recognizer?: Recognizer): RecognizerFormValues => {
  const pattern = recognizer?.recognizerConfig?.patterns?.[0];
  const regexFlags = recognizer?.recognizerConfig?.regexFlags;

  return {
    name: recognizer?.name ?? '',
    displayName: recognizer?.displayName ?? '',
    target: recognizer?.target
      ? { id: recognizer.target, label: recognizer.target }
      : null,
    confidenceThreshold: recognizer?.confidenceThreshold ?? 0.5,
    patternName: pattern?.name ?? '',
    patternRegex: pattern?.regex ?? '',
    patternScore: pattern?.score ?? 0.8,
    dotAll: regexFlags?.dotAll ?? false,
    ignoreCase: regexFlags?.ignoreCase ?? false,
    multiline: regexFlags?.multiline ?? false,
  };
};

const buildRecognizerPayload = (
  values: RecognizerFormValues,
  recognizer?: Recognizer
): Recognizer => ({
  ...recognizer,
  name: values.name,
  displayName: values.displayName || undefined,
  target: values.target?.id as Target,
  confidenceThreshold: values.confidenceThreshold,
  enabled: recognizer?.enabled ?? true,
  recognizerConfig: {
    type: 'pattern',
    patterns: [
      {
        name: values.patternName,
        regex: values.patternRegex,
        score: values.patternScore,
      },
    ],
    regexFlags: {
      dotAll: values.dotAll,
      ignoreCase: values.ignoreCase,
      multiline: values.multiline,
    },
    supportedLanguage: ClassificationLanguage.En,
    context: [],
  },
});

const RecognizerFormDrawer = ({
  recognizer,
  onCancel,
  onSubmit,
}: RecognizerFormDrawerProps) => {
  const { t } = useTranslation();
  const form = useForm<RecognizerFormValues>({
    defaultValues: getDefaultValues(recognizer),
  });

  const targetOptions: TargetSelectItem[] = [
    { id: Target.Content, label: t('label.target-content') },
    { id: Target.ColumnName, label: t('label.target-column-name') },
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

  const patternNameField: FieldProp = {
    name: 'patternName',
    label: t('label.pattern-name'),
    id: 'root/patternName',
    type: FieldTypes.TEXT,
    required: true,
    rules: {
      required: t('label.field-required', { field: t('label.pattern-name') }),
    },
    props: { 'data-testid': 'recognizer-pattern-name-input' },
  };

  const patternRegexField: FieldProp = {
    name: 'patternRegex',
    label: t('label.pattern-regex'),
    id: 'root/patternRegex',
    type: FieldTypes.TEXT,
    required: true,
    rules: {
      required: t('label.field-required', { field: t('label.pattern-regex') }),
    },
    props: { 'data-testid': 'recognizer-pattern-regex-input' },
  };

  const patternScoreField: FieldProp = {
    name: 'patternScore',
    label: t('label.pattern-score'),
    id: 'root/patternScore',
    type: FieldTypes.NUMBER,
    props: { 'data-testid': 'recognizer-pattern-score-input' },
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
        {getField(patternNameField)}
        {getField(patternRegexField)}
        {getField(patternScoreField)}
        {getField(dotAllField)}
        {getField(ignoreCaseField)}
        {getField(multilineField)}
      </HookForm>
    ),
    onSubmit: (data) => handleFormSubmit(data),
  });

  return formDrawer;
};

export default RecognizerFormDrawer;
