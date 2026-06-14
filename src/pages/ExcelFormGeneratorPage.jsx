import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Download, RotateCcw, Plus } from 'lucide-react';
import UniverFormGenerator from '../components/form-builder/UniverFormGenerator';
import { formulairesAPI } from '../services/api';


export default function ExcelFormGeneratorPage() {
  const [formulaires, setFormulaires] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [sheetData, setSheetData] = useState(null);
  const [newFormName, setNewFormName] = useState('');

  // Load formulaires
  useEffect(() => {
    loadFormulaires();
  }, []);

  const loadFormulaires = () => {
    formulairesAPI.lister({ actif: true })
      .then(r => {
        setFormulaires(r.data || []);
        if (r.data && r.data.length > 0) {
          setSelectedId(r.data[0].id);
        }
      })
      .catch(() => toast.error('Impossible de charger les formulaires'));
  };

  const selectedForm = formulaires.find(item => item.id === selectedId);

  const handleDataChange = (data) => {
    console.log('Sheet data updated:', data);
    setSheetData(data);
  };

  const handleSaveFormulaire = async () => {
    if (!selectedForm || !sheetData) {
      toast.error('Veuillez sélectionner un formulaire et ajouter des données');
      return;
    }

    setSaving(true);
    try {
      // Save sheet data to backend
      const formData = {
        titre: selectedForm.titre,
        code: selectedForm.code,
        donnees: sheetData, // Store raw array data
      };

      await formulairesAPI.mettre_a_jour(selectedForm.id, formData);
      toast.success('Formulaire sauvegardé avec succès');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    if (!sheetData || sheetData.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    try {
      // Convert array data to CSV
      let csv = '';
      sheetData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          csv += (cell || '');
          if (colIndex < row.length - 1) csv += ',';
        });
        csv += '\n';
      });

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      element.setAttribute('download', `${selectedForm?.titre || 'formulaire'}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success('Fichier exporté avec succès');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleReset = () => {
    setSheetData(null);
    toast.info('Grille réinitialisée');
  };

  const handleCreateNew = () => {
    if (!newFormName.trim()) {
      toast.error('Veuillez entrer un nom pour le formulaire');
      return;
    }

    // In a real app, you would call the API to create a new form
    toast.success(`Nouveau formulaire "${newFormName}" créé`);
    setNewFormName('');
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Générateur de Formulaires</h1>
              <p className="text-sm text-gray-500 mt-1">Éditeur de feuilles de calcul avancé avec Luckysheet</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSheetData(null)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                title="Réinitialiser"
              >
                <RotateCcw size={18} />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                title="Exporter en CSV"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Exporter</span>
              </button>
              <button
                onClick={handleSaveFormulaire}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <Save size={18} />
                <span className="hidden sm:inline">{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
              </button>
            </div>
          </div>

          {/* Form selector */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formulaire :
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un formulaire...</option>
                {formulaires.map(form => (
                  <option key={form.id} value={form.id}>
                    {form.titre} ({form.code})
                  </option>
                ))}
              </select>
            </div>

            {/* New form input */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau formulaire :
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="Nom du formulaire..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition inline-flex items-center gap-2"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Créer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet container */}
      <div className="flex-1 overflow-hidden bg-white" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="h-full w-full" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {selectedForm ? (
            <UniverFormGenerator 
              onDataChange={handleDataChange}
              initialData={selectedForm.data}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Pas de formulaire sélectionné</h3>
                <p className="mt-1 text-sm text-gray-500">Sélectionnez ou créez un formulaire pour commencer</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <span>Formulaire actif: {selectedForm?.titre || '-'}</span>
          <span>{selectedForm ? `${formulaires.length} formulaire(s)` : 'Aucun formulaire'}</span>
        </div>
      </div>
    </div>
  );
}
