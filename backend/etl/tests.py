import json
from django.test import TestCase
from etl.importers import ExcelImporter

class ExcelImporterNormalizationTests(TestCase):
    def setUp(self):
        self.importer = ExcelImporter(filepath='dummy.xlsx')

    def test_normaliser_regles_from_pipe_separated_string(self):
        result = self.importer.normaliser_regles('R1|R3|R11')
        self.assertEqual(result, ['R1', 'R3', 'R11'])

    def test_normaliser_regles_from_json_array_string(self):
        result = self.importer.normaliser_regles('["R1", "R2"]')
        self.assertEqual(result, ['R1', 'R2'])

    def test_normaliser_interactions_from_pipe_separated_string(self):
        result = self.importer.normaliser_interactions('I5|I8')
        self.assertEqual(result, {'I5': True, 'I8': True})

    def test_normaliser_interactions_from_json_object_string(self):
        result = self.importer.normaliser_interactions('{"I8": true}')
        self.assertEqual(result, {'I8': True})

    def test_normaliser_interactions_empty_values(self):
        self.assertEqual(self.importer.normaliser_interactions('[]'), {})
        self.assertEqual(self.importer.normaliser_interactions('{}'), {})
        self.assertEqual(self.importer.normaliser_interactions(None), {})

    def test_normaliser_regles_from_dict(self):
        result = self.importer.normaliser_regles({'R11': True, 'R4': False})
        self.assertEqual(result, ['R11', 'R4'])
