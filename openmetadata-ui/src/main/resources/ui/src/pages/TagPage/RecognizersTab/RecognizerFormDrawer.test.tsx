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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  FormProvider,
  useController,
  useForm,
  useFormContext,
} from 'react-hook-form';
import {
  ClassificationLanguage,
  Recognizer,
  Target,
} from '../../../generated/type/recognizer';
import RecognizerFormDrawer from './RecognizerFormDrawer';

jest.mock('@openmetadata/ui-core-components', () => ({
  Box: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    ['data-testid']: testId,
  }: {
    children: ReactNode;
    onClick?: () => void;
    'data-testid'?: string;
  }) => (
    <button data-testid={testId} type="button" onClick={onClick}>
      {children}
    </button>
  ),
  ButtonUtility: ({
    onClick,
    ['data-testid']: testId,
  }: {
    onClick?: () => void;
    'data-testid'?: string;
  }) => <button data-testid={testId} type="button" onClick={onClick} />,
  FieldTypes: {
    CHECKBOX: 'CHECKBOX',
    NUMBER: 'NUMBER',
    SELECT: 'SELECT',
    TEXT: 'TEXT',
    TEXTAREA: 'TEXTAREA',
  },
  HelperTextType: { ALERT: 'alert', TOOLTIP: 'tooltip' },
  getField: ({
    name,
    label,
    type,
    props: fieldProps = {},
  }: {
    name: string;
    label: ReactNode;
    type: string;
    props?: Record<string, unknown>;
  }) => {
    const testId = fieldProps['data-testid'] as string | undefined;

    const MockField = () => {
      const { control } = useFormContext();
      const { field } = useController({ control, name });

      if (type === 'SELECT') {
        const options =
          (fieldProps.options as { id: string; label: string }[]) ?? [];

        return (
          <div>
            <label>{label}</label>
            <select
              data-testid={testId}
              value={(field.value as { id: string } | null)?.id ?? ''}
              onChange={(e) => {
                const next = options.find((opt) => opt.id === e.target.value);
                field.onChange(next ?? null);
              }}>
              <option value="" />
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      }

      if (type === 'CHECKBOX') {
        return (
          <div>
            <label>{label}</label>
            <input
              checked={Boolean(field.value)}
              data-testid={testId}
              type="checkbox"
              onChange={(e) => field.onChange(e.target.checked)}
            />
          </div>
        );
      }

      if (type === 'NUMBER') {
        return (
          <div>
            <label>{label}</label>
            <input
              data-testid={testId}
              type="number"
              value={(field.value as number) ?? ''}
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          </div>
        );
      }

      if (type === 'TEXTAREA') {
        return (
          <div>
            <label>{label}</label>
            <textarea
              data-testid={testId}
              value={(field.value as string) ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </div>
        );
      }

      return (
        <div>
          <label>{label}</label>
          <input
            data-testid={testId}
            value={(field.value as string) ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
          />
        </div>
      );
    };

    return <MockField />;
  },
  HookForm: ({
    form,
    children,
    onSubmit,
  }: {
    form: ReturnType<typeof useForm>;
    children: ReactNode;
    onSubmit?: (e: React.FormEvent) => void;
  }) => (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        {children}
        <button type="submit">submit-hidden</button>
      </form>
    </FormProvider>
  ),
}));

jest.mock('../../../components/common/atoms/drawer/useFormDrawer', () => ({
  useFormDrawerWithHook: ({
    form,
    onCancel,
    title,
  }: {
    form: ReactNode;
    onCancel?: () => void;
    title: ReactNode;
  }) => ({
    formDrawer: (
      <div data-testid="recognizer-form-drawer">
        <h1>{title}</h1>
        {form}
        <button data-testid="drawer-cancel-button" onClick={onCancel} />
      </div>
    ),
    openDrawer: jest.fn(),
    closeDrawer: jest.fn(),
    isOpen: true,
  }),
}));

const mockExistingPatternRecognizer: Recognizer = {
  id: 'r1',
  name: 'EmailPatternRecognizer',
  displayName: 'Email Pattern Recognizer',
  enabled: true,
  target: Target.Content,
  confidenceThreshold: 0.6,
  recognizerConfig: {
    type: 'pattern',
    patterns: [
      { name: 'EmailRegex', regex: '^.+@.+$', score: 0.8 },
      { name: 'AltRegex', regex: '^.+$', score: 0.5 },
    ],
    regexFlags: { dotAll: true, ignoreCase: false, multiline: true },
    supportedLanguage: ClassificationLanguage.En,
    context: [],
  },
};

const mockExistingExactTermsRecognizer: Recognizer = {
  id: 'r2',
  name: 'DenylistRecognizer',
  enabled: true,
  target: Target.Content,
  confidenceThreshold: 0.6,
  recognizerConfig: {
    type: 'exact_terms',
    exactTerms: ['foo', 'bar'],
    regexFlags: { dotAll: false, ignoreCase: false, multiline: false },
    supportedLanguage: ClassificationLanguage.En,
  },
};

describe('RecognizerFormDrawer', () => {
  const onCancel = jest.fn();
  const onSubmit = jest.fn();

  it('should render empty fields in create mode with a single pattern row', () => {
    render(<RecognizerFormDrawer onCancel={onCancel} onSubmit={onSubmit} />);

    expect(screen.getByTestId('recognizer-name-input')).toHaveValue('');
    expect(screen.getByTestId('recognizer-pattern-regex-input-0')).toHaveValue(
      ''
    );
    expect(
      screen.queryByTestId('recognizer-pattern-regex-input-1')
    ).not.toBeInTheDocument();
  });

  it('should pre-fill fields from the given pattern recognizer in edit mode', () => {
    render(
      <RecognizerFormDrawer
        recognizer={mockExistingPatternRecognizer}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByTestId('recognizer-name-input')).toHaveValue(
      'EmailPatternRecognizer'
    );
    expect(screen.getByTestId('recognizer-pattern-regex-input-0')).toHaveValue(
      '^.+@.+$'
    );
    expect(screen.getByTestId('recognizer-pattern-regex-input-1')).toHaveValue(
      '^.+$'
    );
    expect(screen.getByTestId('recognizer-target-select')).toHaveValue(
      'content'
    );
    expect(screen.getByTestId('recognizer-type-select')).toHaveValue('pattern');
  });

  it('should pre-fill exact terms from the given exact-terms recognizer in edit mode', () => {
    render(
      <RecognizerFormDrawer
        recognizer={mockExistingExactTermsRecognizer}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByTestId('recognizer-type-select')).toHaveValue(
      'exact_terms'
    );
    expect(screen.getByTestId('recognizer-exact-terms-input')).toHaveValue(
      'foo, bar'
    );
    expect(
      screen.queryByTestId('recognizer-pattern-regex-input-0')
    ).not.toBeInTheDocument();
  });

  it('should add and remove pattern rows', () => {
    render(<RecognizerFormDrawer onCancel={onCancel} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId('add-pattern-button'));

    expect(
      screen.getByTestId('recognizer-pattern-regex-input-1')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('remove-pattern-button-1'));

    expect(
      screen.queryByTestId('recognizer-pattern-regex-input-1')
    ).not.toBeInTheDocument();
  });

  it('should submit a multi-pattern Recognizer payload built from the form values', async () => {
    render(<RecognizerFormDrawer onCancel={onCancel} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByTestId('recognizer-name-input'), {
      target: { value: 'NewRecognizer' },
    });
    fireEvent.change(screen.getByTestId('recognizer-target-select'), {
      target: { value: 'content' },
    });
    fireEvent.change(screen.getByTestId('recognizer-pattern-name-input-0'), {
      target: { value: 'MyPattern' },
    });
    fireEvent.change(screen.getByTestId('recognizer-pattern-regex-input-0'), {
      target: { value: '^abc$' },
    });

    fireEvent.click(screen.getByTestId('add-pattern-button'));
    fireEvent.change(screen.getByTestId('recognizer-pattern-name-input-1'), {
      target: { value: 'SecondPattern' },
    });
    fireEvent.change(screen.getByTestId('recognizer-pattern-regex-input-1'), {
      target: { value: '^def$' },
    });

    fireEvent.click(screen.getByText('submit-hidden'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'NewRecognizer',
          target: 'content',
          recognizerConfig: expect.objectContaining({
            type: 'pattern',
            patterns: [
              expect.objectContaining({ name: 'MyPattern', regex: '^abc$' }),
              expect.objectContaining({
                name: 'SecondPattern',
                regex: '^def$',
              }),
            ],
          }),
        })
      )
    );
  });

  it('should submit an exact-terms Recognizer payload when the type is switched', async () => {
    render(<RecognizerFormDrawer onCancel={onCancel} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByTestId('recognizer-name-input'), {
      target: { value: 'DenylistRecognizer' },
    });
    fireEvent.change(screen.getByTestId('recognizer-target-select'), {
      target: { value: 'content' },
    });
    fireEvent.change(screen.getByTestId('recognizer-type-select'), {
      target: { value: 'exact_terms' },
    });
    fireEvent.change(screen.getByTestId('recognizer-exact-terms-input'), {
      target: { value: 'foo, bar,baz' },
    });

    fireEvent.click(screen.getByText('submit-hidden'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'DenylistRecognizer',
          recognizerConfig: expect.objectContaining({
            type: 'exact_terms',
            exactTerms: ['foo', 'bar', 'baz'],
          }),
        })
      )
    );
  });

  it('should call onCancel when cancel is clicked', () => {
    render(<RecognizerFormDrawer onCancel={onCancel} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByTestId('drawer-cancel-button'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
