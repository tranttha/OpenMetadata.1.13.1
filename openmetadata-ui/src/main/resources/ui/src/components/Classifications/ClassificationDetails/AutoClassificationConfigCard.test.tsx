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
import { ConflictResolution } from '../../../generated/entity/classification/classification';
import AutoClassificationConfigCard from './AutoClassificationConfigCard';

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
    ).toHaveValue('0.75');
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

    fireEvent.click(screen.getByText('label.save'));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ minimumConfidence: 0.9 })
      )
    );
  });
});
