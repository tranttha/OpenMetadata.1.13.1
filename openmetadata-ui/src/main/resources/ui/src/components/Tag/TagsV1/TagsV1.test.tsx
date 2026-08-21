/*
 *  Copyright 2023 Collate.
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

import { createTheme, Theme, ThemeProvider } from '@mui/material/styles';
import { fireEvent, getByTestId, render } from '@testing-library/react';
import { TAG_CONSTANT, TAG_START_WITH } from '../../../constants/Tag.constants';
import { LabelType, State, TagSource } from '../../../generated/type/tagLabel';
import EntityLink from '../../../utils/EntityLink';
import tagClassBase from '../../../utils/TagClassBase';
import TagsV1 from './TagsV1.component';

const mockLinkButton = jest.fn();

const theme: Theme = createTheme({
  palette: {
    allShades: {
      brand: {
        50: '#EFF8FF',
        100: '#D1E9FF',
        900: '#194185',
      },
    },
  },
});

jest.mock('react-router-dom', () => ({
  Link: jest.fn().mockImplementation(({ children, ...rest }) => (
    <a {...rest} onClick={mockLinkButton}>
      {children}
    </a>
  )),
}));

jest.mock('../../../utils/TagsUtils', () => ({
  getTagDisplay: jest.fn().mockReturnValue('tags'),
  getTagTooltip: jest.fn().mockReturnValue(<p>ToolTip Data</p>),
}));

jest.mock('../../../utils/ColorUtils', () => ({
  reduceColorOpacity: jest.fn().mockReturnValue('#00000'),
}));

jest.mock('../../../utils/TagClassBase', () => ({
  __esModule: true,
  default: { getRecognizerFeedbackPopup: jest.fn() },
}));

jest.mock('../../../utils/EntityLink', () => ({
  __esModule: true,
  default: { getTableColumnNameFromColumnFqn: jest.fn() },
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('Test tags Component', () => {
  it('Component should render', () => {
    const { container } = render(
      <TagsV1
        startWith={TAG_START_WITH.SOURCE_ICON}
        tag={{ ...TAG_CONSTANT, tagFQN: 'test' }}
      />,
      { wrapper: Wrapper }
    );
    const tags = getByTestId(container, 'tags');

    expect(tags).toBeInTheDocument();
  });

  it('Component should render add tag button', () => {
    const { container } = render(
      <TagsV1
        startWith={TAG_START_WITH.PLUS}
        tag={{ ...TAG_CONSTANT, tagFQN: 'add tag' }}
      />,
      { wrapper: Wrapper }
    );
    const addTags = getByTestId(container, 'add-tag');

    expect(addTags).toBeInTheDocument();
  });

  it('Clicking on tag with source Classification should redirect to the proper Classification page', () => {
    const { container } = render(
      <TagsV1
        startWith={TAG_START_WITH.SOURCE_ICON}
        tag={{
          labelType: LabelType.Manual,
          source: TagSource.Classification,
          state: State.Confirmed,
          tagFQN: 'testTag.Test1',
        }}
      />,
      { wrapper: Wrapper }
    );
    const tag = getByTestId(container, 'tag-redirect-link');

    fireEvent.click(tag);

    expect(mockLinkButton).toHaveBeenCalledTimes(1);
  });

  it('Clicking on tag with source Glossary should redirect to the proper glossary term page', () => {
    const { container } = render(
      <TagsV1
        startWith={TAG_START_WITH.SOURCE_ICON}
        tag={{
          description: 'TestDescription',
          labelType: LabelType.Manual,
          source: TagSource.Glossary,
          state: State.Confirmed,
          tagFQN: 'glossaryTag.Test1',
        }}
      />,
      { wrapper: Wrapper }
    );
    const tag = getByTestId(container, 'tag-redirect-link');

    fireEvent.click(tag);

    expect(mockLinkButton).toHaveBeenCalledTimes(1);
  });

  it('should render size based tags, for small class should contain small', () => {
    const { container } = render(
      <TagsV1
        size="small"
        startWith={TAG_START_WITH.SOURCE_ICON}
        tag={{
          description: 'TestDescription',
          labelType: LabelType.Manual,
          source: TagSource.Glossary,
          state: State.Confirmed,
          tagFQN: 'glossaryTag.Test1',
        }}
      />,
      { wrapper: Wrapper }
    );
    const tag = getByTestId(container, 'tags');

    expect(tag).toHaveClass('small');
  });

  it('should call tagClassBase.getRecognizerFeedbackPopup for a Generated column-level tag and render its result', () => {
    (EntityLink.getTableColumnNameFromColumnFqn as jest.Mock).mockReturnValue(
      'column1'
    );
    (tagClassBase.getRecognizerFeedbackPopup as jest.Mock).mockReturnValue(
      <div data-testid="mock-recognizer-popup">Popup</div>
    );

    const { getByTestId: getByTestIdFromResult } = render(
      <TagsV1
        entityFqn="service.db.schema.table.column1"
        startWith={TAG_START_WITH.SOURCE_ICON}
        tag={{
          labelType: LabelType.Generated,
          source: TagSource.Classification,
          state: State.Confirmed,
          tagFQN: 'PII.Sensitive',
        }}
      />,
      { wrapper: Wrapper }
    );

    expect(getByTestIdFromResult('mock-recognizer-popup')).toBeInTheDocument();
    expect(tagClassBase.getRecognizerFeedbackPopup).toHaveBeenCalledWith(
      expect.objectContaining({ tagFQN: 'PII.Sensitive' }),
      'service.db.schema.table.column1',
      expect.anything()
    );
  });

  it('should not call tagClassBase.getRecognizerFeedbackPopup for a Generated table-level tag', () => {
    (EntityLink.getTableColumnNameFromColumnFqn as jest.Mock).mockReturnValue(
      ''
    );
    (tagClassBase.getRecognizerFeedbackPopup as jest.Mock).mockClear();

    render(
      <TagsV1
        entityFqn="service.db.schema.table"
        startWith={TAG_START_WITH.SOURCE_ICON}
        tag={{
          labelType: LabelType.Generated,
          source: TagSource.Classification,
          state: State.Confirmed,
          tagFQN: 'PII.Sensitive',
        }}
      />,
      { wrapper: Wrapper }
    );

    expect(tagClassBase.getRecognizerFeedbackPopup).not.toHaveBeenCalled();
  });
});
