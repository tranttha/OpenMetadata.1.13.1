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
  LabelType,
  State,
  TagLabel,
  TagSource,
} from '../../../generated/type/tagLabel';
import { postRecognizerFeedback } from '../../../rest/tagAPI';
import { showErrorToast, showSuccessToast } from '../../../utils/ToastUtils';
import ReportTagFeedbackModal from './ReportTagFeedbackModal';

jest.mock('../../../rest/tagAPI', () => ({
  postRecognizerFeedback: jest.fn(),
}));

jest.mock('../../../utils/ToastUtils', () => ({
  showErrorToast: jest.fn(),
  showSuccessToast: jest.fn(),
}));

jest.mock('../../../utils/TagClassBase', () => ({
  __esModule: true,
  default: {
    getTags: jest.fn(() => Promise.resolve({ data: [], paging: {} })),
  },
}));

jest.mock('@openmetadata/ui-core-components', () => ({
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
  Dialog: Object.assign(
    ({ children }: { children: ReactNode }) => (
      <div data-testid="report-tag-feedback-modal">{children}</div>
    ),
    {
      Header: ({
        title,
        children,
      }: {
        title?: string;
        children?: ReactNode;
      }) => (
        <div>
          <h1>{title}</h1>
          {children}
        </div>
      ),
      Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      Footer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }
  ),
  FieldTypes: {
    SELECT: 'SELECT',
    TAG_SUGGESTION: 'TAG_SUGGESTION',
    TEXTAREA: 'TEXTAREA',
  },
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

      return <div data-testid={testId ?? name} />;
    };

    return <MockField />;
  },
  HookForm: ({
    form,
    children,
    id,
    onSubmit,
  }: {
    form: ReturnType<typeof useForm>;
    children: ReactNode;
    id?: string;
    onSubmit?: (e: React.FormEvent) => void;
  }) => (
    <FormProvider {...form}>
      <form id={id} onSubmit={onSubmit}>
        {children}
      </form>
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
  Typography: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}));

const mockTagLabel: TagLabel = {
  tagFQN: 'PII.Email',
  source: TagSource.Classification,
  labelType: LabelType.Generated,
  state: State.Confirmed,
};

const selectRequiredFields = () => {
  fireEvent.change(screen.getByTestId('report-tag-feedback-type-select'), {
    target: { value: 'FALSE_POSITIVE' },
  });
  fireEvent.change(screen.getByTestId('report-tag-user-reason-select'), {
    target: { value: 'NOT_SENSITIVE_DATA' },
  });
};

describe('ReportTagFeedbackModal', () => {
  const onCancel = jest.fn();
  const onSubmitted = jest.fn();

  it('should render the read-only column/tag row, feedback type, user reason, and comments fields', () => {
    render(
      <ReportTagFeedbackModal
        entityFqn="service.db.schema.sensitive_customers.DWH_X10"
        tagLabel={mockTagLabel}
        onCancel={onCancel}
        onSubmitted={onSubmitted}
      />
    );

    expect(screen.getByTestId('report-tag-column-name')).toHaveTextContent(
      'sensitive_customers.DWH_X10'
    );
    expect(screen.getByTestId('report-tag-tag-name')).toHaveTextContent(
      'Email'
    );
    expect(
      screen.getByTestId('report-tag-feedback-type-select')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('report-tag-user-reason-select')
    ).toBeInTheDocument();
    expect(screen.getByTestId('report-tag-comments-input')).toBeInTheDocument();
  });

  it('should submit feedback with a correctly built entityLink and call onSubmitted on success', async () => {
    (postRecognizerFeedback as jest.Mock).mockResolvedValueOnce({});

    render(
      <ReportTagFeedbackModal
        entityFqn="service.db.schema.sensitive_customers.DWH_X10"
        tagLabel={mockTagLabel}
        onCancel={onCancel}
        onSubmitted={onSubmitted}
      />
    );

    selectRequiredFields();
    fireEvent.click(screen.getByTestId('report-tag-remove-button'));

    await waitFor(() =>
      expect(postRecognizerFeedback).toHaveBeenCalledWith('PII.Email', {
        entityLink:
          '<#E::table::service.db.schema.sensitive_customers::columns::DWH_X10>',
        tagFQN: 'PII.Email',
        feedbackType: 'FALSE_POSITIVE',
        userReason: 'NOT_SENSITIVE_DATA',
        userComments: undefined,
        suggestedTag: undefined,
      })
    );

    expect(showSuccessToast).toHaveBeenCalledWith(
      'message.feedback-submitted-successfully'
    );
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it('should not submit when required fields are missing', () => {
    render(
      <ReportTagFeedbackModal
        entityFqn="service.db.schema.sensitive_customers.DWH_X10"
        tagLabel={mockTagLabel}
        onCancel={onCancel}
        onSubmitted={onSubmitted}
      />
    );

    fireEvent.click(screen.getByTestId('report-tag-remove-button'));

    expect(postRecognizerFeedback).not.toHaveBeenCalled();
  });

  it('should show an error toast and not call onSubmitted when the API call fails', async () => {
    (postRecognizerFeedback as jest.Mock).mockRejectedValueOnce(
      new Error('failed')
    );

    render(
      <ReportTagFeedbackModal
        entityFqn="service.db.schema.sensitive_customers.DWH_X10"
        tagLabel={mockTagLabel}
        onCancel={onCancel}
        onSubmitted={onSubmitted}
      />
    );

    selectRequiredFields();
    fireEvent.click(screen.getByTestId('report-tag-remove-button'));

    await waitFor(() => expect(showErrorToast).toHaveBeenCalledTimes(1));

    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('should reset the form when Reset is clicked', () => {
    render(
      <ReportTagFeedbackModal
        entityFqn="service.db.schema.sensitive_customers.DWH_X10"
        tagLabel={mockTagLabel}
        onCancel={onCancel}
        onSubmitted={onSubmitted}
      />
    );

    fireEvent.change(screen.getByTestId('report-tag-comments-input'), {
      target: { value: 'some comment' },
    });
    fireEvent.click(screen.getByTestId('report-tag-reset-button'));

    expect(screen.getByTestId('report-tag-comments-input')).toHaveValue('');
  });
});
