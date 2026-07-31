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
import { Recognizer, Target } from '../../../generated/type/recognizer';
import RecognizerExceptionsModal from './RecognizerExceptionsModal';

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
  ButtonUtility: ({
    onClick,
    ['data-testid']: testId,
  }: {
    onClick?: () => void;
    'data-testid'?: string;
  }) => <button data-testid={testId} onClick={onClick} />,
  Dialog: Object.assign(
    ({ children }: { children: ReactNode }) => (
      <div data-testid="recognizer-exceptions-modal">{children}</div>
    ),
    {
      Header: ({ title }: { title?: string }) => <h1>{title}</h1>,
      Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }
  ),
  Modal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalOverlay: ({
    children,
    isOpen,
  }: {
    children: ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div>{children}</div> : null),
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
  Typography: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}));

const mockRecognizer: Recognizer = {
  id: 'r1',
  name: 'EmailPatternRecognizer',
  displayName: 'Email Pattern Recognizer',
  enabled: true,
  target: Target.Content,
  recognizerConfig: { type: 'pattern', patterns: [], regexFlags: {} },
  exceptionList: [
    {
      entityLink: '<#E::table::service.db.schema.table::columns::col1>',
      reason: 'Test data',
      addedBy: { id: 'u1', type: 'user', name: 'jdoe' },
      addedAt: 1700000000000,
    },
  ],
};

describe('RecognizerExceptionsModal', () => {
  const onClose = jest.fn();
  const onDeleteException = jest.fn();

  it('should render a row for each exception with its entity link and reason', () => {
    render(
      <RecognizerExceptionsModal
        recognizer={mockRecognizer}
        onClose={onClose}
        onDeleteException={onDeleteException}
      />
    );

    expect(
      screen.getByText('<#E::table::service.db.schema.table::columns::col1>')
    ).toBeInTheDocument();
    expect(screen.getByText('Test data')).toBeInTheDocument();
    expect(screen.getByText('jdoe')).toBeInTheDocument();
  });

  it('should show the empty state when the recognizer has no exceptions', () => {
    render(
      <RecognizerExceptionsModal
        recognizer={{ ...mockRecognizer, exceptionList: [] }}
        onClose={onClose}
        onDeleteException={onDeleteException}
      />
    );

    expect(
      screen.getByText('message.no-exceptions-configured')
    ).toBeInTheDocument();
  });

  it('should call onDeleteException with the entity link after confirming delete', async () => {
    onDeleteException.mockResolvedValueOnce(undefined);

    render(
      <RecognizerExceptionsModal
        recognizer={mockRecognizer}
        onClose={onClose}
        onDeleteException={onDeleteException}
      />
    );

    fireEvent.click(screen.getByTestId('delete-exception-0'));
    fireEvent.click(screen.getByTestId('confirm-button'));

    await waitFor(() =>
      expect(onDeleteException).toHaveBeenCalledWith(
        '<#E::table::service.db.schema.table::columns::col1>'
      )
    );
  });
});
