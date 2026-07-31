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

import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  LabelType,
  State,
  TagLabel,
  TagSource,
} from '../../../generated/type/tagLabel';
import ReportTagPopover from './ReportTagPopover';

jest.mock('./ReportTagFeedbackModal', () => {
  return jest.fn(({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="report-tag-feedback-modal-mock">
      <button data-testid="mock-modal-cancel" onClick={onCancel} />
    </div>
  ));
});

jest.mock('../../../utils/date-time/DateTimeUtils', () => ({
  formatDateTime: jest.fn(() => 'Feb 18, 2026, 05:59 PM'),
  getCurrentMillis: jest.fn(() => 0),
  getEndOfDayInMillis: jest.fn(() => 0),
  getEpochMillisForPastDays: jest.fn(() => 0),
  getStartOfDayInMillis: jest.fn(() => 0),
}));

jest.mock('@openmetadata/ui-core-components', () => ({
  Badge: ({
    children,
    ['data-testid']: testId,
  }: {
    children: ReactNode;
    'data-testid'?: string;
  }) => <span data-testid={testId}>{children}</span>,
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
  Popover: ({ children }: { children: ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: ReactNode }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  Typography: ({
    children,
    ['data-testid']: testId,
  }: {
    children: ReactNode;
    'data-testid'?: string;
  }) => <span data-testid={testId}>{children}</span>,
}));

const mockTagLabel: TagLabel = {
  tagFQN: 'PII.Email',
  source: TagSource.Classification,
  labelType: LabelType.Generated,
  state: State.Confirmed,
  appliedAt: new Date('2026-02-18T17:59:00.000Z'),
  metadata: {
    recognizer: {
      recognizerId: 'r1',
      recognizerName: 'EmailRecognizer',
      score: 0.85,
      patterns: [
        { name: 'EmailRegex', score: 0.9 },
        { name: 'EmailRegex', score: 0.8 },
      ],
    },
  },
};

describe('ReportTagPopover', () => {
  it('should render the children trigger', () => {
    render(
      <ReportTagPopover
        entityFqn="service.db.schema.table.col1"
        tagLabel={mockTagLabel}>
        <span data-testid="tag-chip-child">Tag</span>
      </ReportTagPopover>
    );

    expect(screen.getByTestId('tag-chip-child')).toBeInTheDocument();
  });

  it('should show the tag name, content analysis summary, tag source, and tagged-at date', () => {
    render(
      <ReportTagPopover
        entityFqn="service.db.schema.table.col1"
        tagLabel={mockTagLabel}>
        <span data-testid="tag-chip-child">Tag</span>
      </ReportTagPopover>
    );

    expect(screen.getByTestId('report-tag-name')).toHaveTextContent('Email');
    expect(
      screen.getByTestId('report-tag-detection-summary')
    ).toHaveTextContent('message.recognizer-detection-summary');
    expect(screen.getByTestId('report-tag-source')).toHaveTextContent(
      'label.autoclassification-bot'
    );
    expect(screen.getByTestId('report-tag-tagged-at')).toHaveTextContent(
      'Feb 18, 2026, 05:59 PM'
    );
  });

  it('should expand pattern details when View more is clicked', () => {
    render(
      <ReportTagPopover
        entityFqn="service.db.schema.table.col1"
        tagLabel={mockTagLabel}>
        <span data-testid="tag-chip-child">Tag</span>
      </ReportTagPopover>
    );

    expect(
      screen.queryByTestId('report-tag-pattern-details')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('report-tag-view-more'));

    expect(
      screen.getByTestId('report-tag-pattern-details')
    ).toBeInTheDocument();
  });

  it('should open the feedback modal when Report Tag is clicked', () => {
    render(
      <ReportTagPopover
        entityFqn="service.db.schema.table.col1"
        tagLabel={mockTagLabel}>
        <span data-testid="tag-chip-child">Tag</span>
      </ReportTagPopover>
    );

    fireEvent.click(screen.getByTestId('report-tag-button'));

    expect(
      screen.getByTestId('report-tag-feedback-modal-mock')
    ).toBeInTheDocument();
  });

  it('should not show the feedback modal until Report Tag is clicked', () => {
    render(
      <ReportTagPopover
        entityFqn="service.db.schema.table.col1"
        tagLabel={mockTagLabel}>
        <span data-testid="tag-chip-child">Tag</span>
      </ReportTagPopover>
    );

    expect(
      screen.queryByTestId('report-tag-feedback-modal-mock')
    ).not.toBeInTheDocument();
  });

  it('should close the feedback modal when it cancels', () => {
    render(
      <ReportTagPopover
        entityFqn="service.db.schema.table.col1"
        tagLabel={mockTagLabel}>
        <span data-testid="tag-chip-child">Tag</span>
      </ReportTagPopover>
    );

    fireEvent.click(screen.getByTestId('report-tag-button'));
    fireEvent.click(screen.getByTestId('mock-modal-cancel'));

    expect(
      screen.queryByTestId('report-tag-feedback-modal-mock')
    ).not.toBeInTheDocument();
  });
});
