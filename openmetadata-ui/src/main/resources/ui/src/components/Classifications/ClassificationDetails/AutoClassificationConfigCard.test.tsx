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
import { ConflictResolution } from '../../../generated/entity/classification/classification';
import AutoClassificationConfigCard from './AutoClassificationConfigCard';

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
    <button data-testid={testId} onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Dialog: Object.assign(
    ({ children }: { children: ReactNode }) => (
      <div data-testid="auto-classification-config-modal">{children}</div>
    ),
    {
      Header: ({ title }: { title?: string }) => <h1>{title}</h1>,
      Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      Footer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }
  ),
  FieldTypes: { NUMBER: 'NUMBER', SELECT: 'SELECT', SWITCH: 'SWITCH' },
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

      if (type === 'SWITCH') {
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

      return <div data-testid={testId ?? name} />;
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
      <form onSubmit={onSubmit}>{children}</form>
    </FormProvider>
  ),
  Modal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalOverlay: ({
    children,
    isOpen,
  }: {
    children: ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div>{children}</div> : null),
  Typography: ({
    children,
    ['data-testid']: testId,
  }: {
    children: ReactNode;
    'data-testid'?: string;
  }) => <span data-testid={testId}>{children}</span>,
}));

describe('AutoClassificationConfigCard', () => {
  it('should render default values when no config is provided', () => {
    render(
      <AutoClassificationConfigCard hasEditPermission onUpdate={jest.fn()} />
    );

    expect(
      screen.getByTestId('auto-classification-enabled-value')
    ).toHaveTextContent('label.no');
    expect(
      screen.getByTestId('auto-classification-minimum-confidence-value')
    ).toHaveTextContent('0.6');
  });

  it('should render provided config values', () => {
    render(
      <AutoClassificationConfigCard
        hasEditPermission
        config={{
          enabled: true,
          conflictResolution: ConflictResolution.HighestPriority,
          minimumConfidence: 0.7,
          requireExplicitMatch: false,
        }}
        onUpdate={jest.fn()}
      />
    );

    expect(
      screen.getByTestId('auto-classification-enabled-value')
    ).toHaveTextContent('label.yes');
    expect(
      screen.getByTestId('auto-classification-minimum-confidence-value')
    ).toHaveTextContent('0.7');
    expect(
      screen.getByTestId('auto-classification-require-explicit-match-value')
    ).toHaveTextContent('label.no');
  });

  it('should not render the edit button when hasEditPermission is false', () => {
    render(
      <AutoClassificationConfigCard
        hasEditPermission={false}
        onUpdate={jest.fn()}
      />
    );

    expect(
      screen.queryByTestId('edit-auto-classification-config-button')
    ).not.toBeInTheDocument();
  });

  it('should open the edit modal with the current values pre-filled', () => {
    render(
      <AutoClassificationConfigCard
        hasEditPermission
        config={{ enabled: true, minimumConfidence: 0.75 }}
        onUpdate={jest.fn()}
      />
    );

    fireEvent.click(
      screen.getByTestId('edit-auto-classification-config-button')
    );

    expect(
      screen.getByTestId('auto-classification-config-modal')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('auto-classification-minimum-confidence-input')
    ).toHaveValue(0.75);
  });

  it('should call onUpdate with the edited values on save', async () => {
    const onUpdate = jest.fn();
    render(
      <AutoClassificationConfigCard
        hasEditPermission
        config={{ enabled: false, minimumConfidence: 0.6 }}
        onUpdate={onUpdate}
      />
    );

    fireEvent.click(
      screen.getByTestId('edit-auto-classification-config-button')
    );

    const confidenceInput = screen.getByTestId(
      'auto-classification-minimum-confidence-input'
    );
    fireEvent.change(confidenceInput, { target: { value: '0.9' } });

    fireEvent.click(screen.getByTestId('auto-classification-modal-save'));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ minimumConfidence: 0.9 })
      )
    );
  });
});
