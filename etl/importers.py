import pandas as pd
import json
from django.db import transaction
from dossiers.models import Dossier

class ExcelImporter:
    # On définit le mapping comme une variable de classe ici
    COLUMN_MAP = {
        'id_emp_hash': 'id_emp_hash',
        'EMP_SECTEUR': 'emp_secteur',
        'FORME_NOM': 'forme_nom',
        'REG_KEY': 'reg_key',
        'anciennete_annees': 'anciennete_annees',
        'EMP_EFFECTIF': 'emp_effectif',
        'EMP_STOP_CO': 'emp_stop_co',
        'ACTIVITY_STATUS': 'activity_status',
        'has_declaration': 'has_declaration',
        'has_payment': 'has_payment',
        'montant_dette_total': 'montant_dette_total',
        'flag_fraude_confirmee_ever': 'flag_fraude_confirmee_ever',
        'flag_non_respect_ever': 'flag_non_respect_ever',
        'flag_redressement_ever': 'flag_redressement_ever',
        'score_global': 'score_global',
        'niveau_risque': 'niveau_risque',
        'score_employeur': 'score_employeur',
        'score_declaration': 'score_declaration',
        'score_recouvrement': 'score_recouvrement',
        'score_controle': 'score_controle',
        'score_protocole': 'score_protocole',
        'regles_declenchees': 'regles_declenchees',
        'nb_regles': 'nb_regles',
        'interactions_detectees': 'interactions_detectees',
        'nb_interactions': 'nb_interactions',
        'top_feature_1': 'top_feature_1',
        'top_feature_2': 'top_feature_2',
        'top_feature_3': 'top_feature_3',
        'recommandation_1': 'recommandation_1',
        'recommandation_2': 'recommandation_2',
        'score_anomalie': 'score_anomalie',
        'niveau_anomalie': 'niveau_anomalie',
        'is_outlier_iforest': 'is_outlier_iforest',
        'anomalie_top_1': 'anomalie_top_1',
        'anomalie_top_2': 'anomalie_top_2',
        'anomalie_top_3': 'anomalie_top_3',
        'quadrant': 'quadrant',
    }

    def __init__(self, filepath):
        self.filepath = filepath

    def nettoyer_json_field(self, valeur, default_type):
        if pd.isna(valeur) or not valeur:
            return default_type()
        if isinstance(valeur, (list, dict)):
            return valeur
        if isinstance(valeur, str):
            try:
                return json.loads(valeur.replace("'", '"'))
            except:
                return default_type()
        return default_type()

    def run(self):
        df = pd.read_excel(self.filepath, engine='openpyxl')
        # On utilise self.COLUMN_MAP maintenant
        df = df.rename(columns=self.COLUMN_MAP)

        def to_bool(val):
            if isinstance(val, bool): return val
            if isinstance(val, str):
                val_low = val.lower().strip()
                if val_low in ['inconnu', 'unknown', 'null', 'nan', 'false', '0']: return False
                if val_low in ['true', '1', 'oui']: return True
            return False

        bool_cols = [
            'emp_stop_co', 'has_declaration', 'has_payment', 
            'flag_fraude_confirmee_ever', 'flag_non_respect_ever', 
            'flag_redressement_ever', 'is_outlier_iforest'
        ]

        for col in bool_cols:
            if col in df.columns:
                df[col] = df[col].apply(to_bool)

        numeric_cols = [
            'anciennete_annees', 'emp_effectif', 'montant_dette_total',
            'score_global', 'score_anomalie', 'nb_regles', 'nb_interactions'
        ]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        def clamp_positive_int(val):
            if pd.isna(val):
                return 0
            try:
                iv = int(val)
            except (ValueError, TypeError):
                return 0
            return iv if iv >= 0 else 0

        positive_int_cols = ['anciennete_annees', 'emp_effectif', 'nb_regles', 'nb_interactions']
        for col in positive_int_cols:
            if col in df.columns:
                df[col] = df[col].apply(clamp_positive_int)

        df = df.fillna({'activity_status': 'ACTIF', 'quadrant': 'Q4_LOW_RISK_LOW_ANOMALY', 'forme_nom': 'Sans Nom'})

        dossiers_a_creer = []
        # On ne garde que les clés qui existent vraiment dans notre modèle
        valid_cols = list(self.COLUMN_MAP.values())
        
        for _, row in df.iterrows():
            row_dict = row.to_dict()
            champs = {k: v for k, v in row_dict.items() if k in valid_cols}
            
            champs['regles_declenchees'] = self.nettoyer_json_field(champs.get('regles_declenchees'), list)
            champs['interactions_detectees'] = self.nettoyer_json_field(champs.get('interactions_detectees'), dict)
            
            dossiers_a_creer.append(Dossier(**champs))

        with transaction.atomic():
            Dossier.objects.bulk_create(dossiers_a_creer, ignore_conflicts=True, batch_size=500)

        return len(dossiers_a_creer)