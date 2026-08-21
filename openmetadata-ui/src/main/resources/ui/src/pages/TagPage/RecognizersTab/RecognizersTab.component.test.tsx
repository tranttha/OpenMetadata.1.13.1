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
import { ClassificationLanguage } from '../../../generated/type/patternRecognizer';
import { Recognizer, Target } from '../../../generated/type/recognizer';
import { patchTag } from '../../../rest/tagAPI';
import { showErrorToast } from '../../../utils/ToastUtils';
import RecognizersTab from './RecognizersTab.component';

jest.mock('../../../rest/tagAPI', () => ({
  patchTag: jest.fn(),
}));

jest.mock('../../../utils/ToastUtils', () => ({
  showErrorToast: jest.fn(),
  showSuccessToast: jest.fn(),
}));

jest.mock('./RecognizerFormDrawer', () => {
  return jest.fn(({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="recognizer-form-drawer-mock">
      <button data-testid="mock-drawer-cancel" onClick={onCancel} />
    </div>
  ));
});

jest.mock('./RecognizerExceptionsModal', () => {
  return jest.fn(({ onClose }: { onClose: () => void }) => (
    <div data-testid="recognizer-exceptions-modal-mock">
      <button data-testid="mock-exceptions-close" onClick={onClose} />
    </div>
  ));
});

jest.mock('../../../components/common/DeleteModal/DeleteModal', () => {
  return jest.fn(
    ({
      open,
      onDelete,
      onCancel,
    }: {
      open: boolean;
      onDelete: () => void;
      onCancel: () => void;
    }) =>
      open ? (
        <div data-testid="delete-modal-mock">
          <button data-testid="confirm-button" onClick={onDelete} />
          <button data-testid="cancel-button" onClick={onCancel} />
        </div>
      ) : null
  );
});

jest.mock('../../../context/PermissionProvider/PermissionProvider', () => ({
  usePermissionProvider: () => ({
    permissions: { all: { All: true } },
  }),
}));

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
  ButtonUtility: ({
    onClick,
    ['data-testid']: testId,
  }: {
    onClick?: () => void;
    'data-testid'?: string;
  }) => <button data-testid={testId} onClick={onClick} />,
  Table: Object.assign(
    ({ children }: { children: ReactNode }) => (
      <table>
        <tbody>{children}</tbody>
      </table>
    ),
    {
      Header: ({
        columns,
        children,
      }: {
        columns: { id: string; name: string }[];
        children: (col: { id: string; name: string }) => ReactNode;
      }) => <thead>{columns.map((col) => children(col))}</thead>,
      Head: ({ label }: { label?: string }) => <th>{label}</th>,
      Body: ({
        items,
        children,
        renderEmptyState,
      }: {
        items: unknown[];
        children: (item: unknown) => ReactNode;
        renderEmptyState?: () => ReactNode;
      }) => (
        <>{items.length > 0 ? items.map(children) : renderEmptyState?.()}</>
      ),
      Row: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
      Cell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
    }
  ),
  Toggle: ({
    isSelected,
    onChange,
    ['data-testid']: testId,
  }: {
    isSelected?: boolean;
    onChange?: (value: boolean) => void;
    'data-testid'?: string;
  }) => (
    <input
      checked={isSelected}
      data-testid={testId}
      type="checkbox"
      onChange={(e) => onChange?.(e.target.checked)}
    />
  ),
  Typography: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}));

const mockPatternRecognizer: Recognizer = {
  id: 'r1',
  name: 'EmailPatternRecognizer',
  displayName: 'Email Pattern Recognizer',
  enabled: true,
  isSystemDefault: false,
  confidenceThreshold: 0.5,
  target: Target.Content,
  recognizerConfig: {
    type: 'pattern',
    patterns: [{ name: 'EmailRegex', regex: '^.+@.+$', score: 0.8 }],
    regexFlags: { dotAll: true, multiline: true, ignoreCase: true },
    supportedLanguage: ClassificationLanguage.En,
    context: [],
  },
  exceptionList: [
    {
      entityLink: '<#E::table::service.db.schema.table::columns::col1>',
      reason: 'Test data',
      addedBy: { id: 'u1', type: 'user', name: 'jdoe' },
      addedAt: 1700000000000,
    },
  ],
};

const mockDisabledRecognizer: Recognizer = {
  id: 'r2',
  name: 'PhoneRecognizer',
  displayName: 'Phone Recognizer',
  enabled: false,
  isSystemDefault: true,
  confidenceThreshold: 0.6,
  target: Target.ColumnName,
  recognizerConfig: {
    type: 'pattern',
    patterns: [{ name: 'PhoneRegex', regex: '^\\d{10}$', score: 0.7 }],
    regexFlags: {},
    supportedLanguage: ClassificationLanguage.En,
    context: [],
  },
};

const mockTag = {
  id: 'tag1',
  name: 'Sensitive',
  fullyQualifiedName: 'PII.Sensitive',
  classification: { id: 'c1', type: 'classification', name: 'PII' },
  recognizers: [mockPatternRecognizer, mockDisabledRecognizer],
} as never;

describe('RecognizersTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a row for each recognizer with its name and target', async () => {
    render(<RecognizersTab tag={mockTag} />);

    expect(
      await screen.findByText('Email Pattern Recognizer')
    ).toBeInTheDocument();
    expect(screen.getByText('Phone Recognizer')).toBeInTheDocument();
  });

  it('should show the exception count for each recognizer', async () => {
    render(<RecognizersTab tag={mockTag} />);

    expect(await screen.findByTestId('exceptions-count-r1')).toHaveTextContent(
      '1'
    );
    expect(screen.getByTestId('exceptions-count-r2')).toHaveTextContent('0');
  });

  it('should open the exceptions modal when the exceptions count is clicked', async () => {
    render(<RecognizersTab tag={mockTag} />);

    fireEvent.click(await screen.findByTestId('exceptions-count-r1'));

    expect(
      screen.getByTestId('recognizer-exceptions-modal-mock')
    ).toBeInTheDocument();
  });

  it('should call patchTag when the enabled toggle is changed', async () => {
    (patchTag as jest.Mock).mockResolvedValueOnce({});

    render(<RecognizersTab tag={mockTag} />);

    const toggle = await screen.findByTestId('recognizer-enabled-toggle-r2');
    fireEvent.click(toggle);

    await waitFor(() => expect(patchTag).toHaveBeenCalledTimes(1));

    const [tagId, patchOps] = (patchTag as jest.Mock).mock.calls[0];

    expect(tagId).toBe('tag1');
    expect(patchOps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/recognizers/1/enabled',
          value: true,
        }),
      ])
    );
  });

  it('should show an error toast when patchTag fails', async () => {
    (patchTag as jest.Mock).mockRejectedValueOnce(new Error('failed'));

    render(<RecognizersTab tag={mockTag} />);

    const toggle = await screen.findByTestId('recognizer-enabled-toggle-r2');
    fireEvent.click(toggle);

    await waitFor(() => expect(showErrorToast).toHaveBeenCalledTimes(1));
  });

  it('should open the create drawer when Add Recognizer is clicked', async () => {
    render(<RecognizersTab tag={mockTag} />);

    fireEvent.click(await screen.findByTestId('add-recognizer-button'));

    expect(
      screen.getByTestId('recognizer-form-drawer-mock')
    ).toBeInTheDocument();
  });

  it('should open the edit drawer when the edit action is clicked', async () => {
    render(<RecognizersTab tag={mockTag} />);

    fireEvent.click(await screen.findByTestId('edit-recognizer-r1'));

    expect(
      screen.getByTestId('recognizer-form-drawer-mock')
    ).toBeInTheDocument();
  });

  it('should call patchTag removing the recognizer after confirming delete', async () => {
    (patchTag as jest.Mock).mockResolvedValueOnce({});

    render(<RecognizersTab tag={mockTag} />);

    fireEvent.click(await screen.findByTestId('delete-recognizer-r2'));
    fireEvent.click(screen.getByTestId('confirm-button'));

    await waitFor(() => expect(patchTag).toHaveBeenCalledTimes(1));

    const [tagId, patchOps] = (patchTag as jest.Mock).mock.calls[0];

    expect(tagId).toBe('tag1');
    expect(patchOps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/recognizers/1', op: 'remove' }),
      ])
    );
  });
});
