#  Copyright 2025 Collate
#  Licensed under the Collate Community License, Version 1.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  https://github.com/open-metadata/OpenMetadata/blob/main/ingestion/LICENSE
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
"""
Unit tests for AutoClassificationWorkflow's classification-name resolution.
"""

from unittest.mock import Mock, patch

from metadata.generated.schema.metadataIngestion.databaseServiceAutoClassificationPipeline import (
    DatabaseServiceAutoClassificationPipeline,
)
from metadata.workflow.classification import AutoClassificationWorkflow


def _build_workflow(classification_names=None) -> AutoClassificationWorkflow:
    """Build an AutoClassificationWorkflow without running BaseWorkflow.__init__,
    since _get_pii_processor only touches self.config and self.metadata."""
    workflow = AutoClassificationWorkflow.__new__(AutoClassificationWorkflow)

    kwargs = {}
    if classification_names is not None:
        kwargs["classificationNames"] = classification_names

    workflow.config = Mock()
    workflow.config.source.sourceConfig.config = DatabaseServiceAutoClassificationPipeline(**kwargs)
    workflow.metadata = Mock()

    return workflow


class TestGetPiiProcessor:
    """Tests for AutoClassificationWorkflow._get_pii_processor."""

    def test_uses_default_classification_names_when_unset(self):
        workflow = _build_workflow()

        with patch("metadata.workflow.classification.create_pii_processor") as mock_create:
            workflow._get_pii_processor()

        mock_create.assert_called_once_with(workflow.metadata, workflow.config, classification_filter=["PII"])

    def test_uses_configured_classification_names(self):
        workflow = _build_workflow(classification_names=["DLCN", "PII"])

        with patch("metadata.workflow.classification.create_pii_processor") as mock_create:
            workflow._get_pii_processor()

        mock_create.assert_called_once_with(
            workflow.metadata,
            workflow.config,
            classification_filter=["DLCN", "PII"],
        )

    def test_falls_back_to_pii_when_list_is_empty(self):
        workflow = _build_workflow(classification_names=[])

        with patch("metadata.workflow.classification.create_pii_processor") as mock_create:
            workflow._get_pii_processor()

        mock_create.assert_called_once_with(workflow.metadata, workflow.config, classification_filter=["PII"])
