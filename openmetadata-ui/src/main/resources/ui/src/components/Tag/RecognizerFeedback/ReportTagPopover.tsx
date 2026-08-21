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
  Badge,
  Button,
  Popover,
  PopoverTrigger,
  Typography,
} from '@openmetadata/ui-core-components';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getNameFromFQN } from '../../../utils/CommonUtils';
import { formatDateTime } from '../../../utils/date-time/DateTimeUtils';
import ReportTagFeedbackModal from './ReportTagFeedbackModal';
import { ReportTagPopoverProps } from './ReportTagPopover.interface';

const HOVER_CLOSE_DELAY_MS = 150;

const ReportTagPopover = ({
  tagLabel,
  entityFqn,
  children,
}: ReportTagPopoverProps) => {
  const { t } = useTranslation();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    },
    []
  );

  const cancelPendingClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  };

  const handlePointerEnter = () => {
    cancelPendingClose();
    setIsPopoverOpen(true);
  };

  const handlePointerLeave = () => {
    cancelPendingClose();
    closeTimeoutRef.current = setTimeout(() => {
      setIsPopoverOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  };

  const recognizer = tagLabel.metadata?.recognizer;
  const patterns = recognizer?.patterns ?? [];

  const averageScore = useMemo(() => {
    if (patterns.length === 0) {
      return recognizer?.score ?? 0;
    }

    const total = patterns.reduce((sum, pattern) => sum + pattern.score, 0);

    return total / patterns.length;
  }, [patterns, recognizer?.score]);

  const handleReportClick = () => {
    cancelPendingClose();
    setIsPopoverOpen(false);
    setIsModalOpen(true);
  };

  const handleCancelClick = () => {
    cancelPendingClose();
    setIsPopoverOpen(false);
  };

  return (
    <PopoverTrigger isOpen={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <span
        ref={triggerRef}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}>
        {children}
      </span>
      <Popover
        isNonModal
        containerClassName="tw:w-80 tw:p-4"
        triggerRef={triggerRef}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}>
        <div className="tw:flex tw:flex-col tw:gap-2">
          <Typography as="p" data-testid="report-tag-name">
            {getNameFromFQN(tagLabel.tagFQN)}
          </Typography>

          <Typography
            as="p"
            className="tw:text-secondary"
            data-testid="report-tag-detection-summary">
            {t('message.recognizer-detection-summary', {
              recognizerName: recognizer?.recognizerName ?? '--',
              count: patterns.length,
              score: Math.round(averageScore * 100),
            })}
          </Typography>

          {patterns.length > 0 && (
            <Button
              className="tw:self-start tw:p-0"
              color="link-color"
              data-testid="report-tag-view-more"
              onClick={() => setIsExpanded((prev) => !prev)}>
              {t('label.view-more')}
            </Button>
          )}

          {isExpanded && (
            <div
              className="tw:flex tw:flex-col tw:gap-1"
              data-testid="report-tag-pattern-details">
              {patterns.map((pattern, index) => (
                <Typography
                  as="p"
                  className="tw:text-tertiary"
                  key={`${pattern.name}-${index}`}>
                  {`${pattern.name}: ${Math.round(pattern.score * 100)}%`}
                </Typography>
              ))}
            </div>
          )}

          <div className="tw:flex tw:items-center tw:gap-2">
            <Typography as="span" className="tw:text-secondary">
              {t('label.tag-source')}:
            </Typography>
            <Badge data-testid="report-tag-source" size="sm">
              {t('label.autoclassification-bot')}
            </Badge>
          </div>

          <Typography
            as="p"
            className="tw:text-secondary"
            data-testid="report-tag-tagged-at">
            {`${t('label.tagged-at')}: ${
              tagLabel.appliedAt
                ? formatDateTime(new Date(tagLabel.appliedAt).getTime())
                : '--'
            }`}
          </Typography>

          <div className="tw:flex tw:justify-end tw:gap-2">
            <Button
              color="secondary"
              data-testid="report-tag-cancel-button"
              size="sm"
              onClick={handleCancelClick}>
              {t('label.cancel')}
            </Button>
            <Button
              color="primary-destructive"
              data-testid="report-tag-button"
              size="sm"
              onClick={handleReportClick}>
              {t('label.report-tag')}
            </Button>
          </div>
        </div>
      </Popover>
      {isModalOpen && (
        <ReportTagFeedbackModal
          entityFqn={entityFqn}
          tagLabel={tagLabel}
          onCancel={() => setIsModalOpen(false)}
          onSubmitted={() => setIsModalOpen(false)}
        />
      )}
    </PopoverTrigger>
  );
};

export default ReportTagPopover;
