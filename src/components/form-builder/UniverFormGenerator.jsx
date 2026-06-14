import React, { useEffect, useRef } from "react";
import Handsontable from "handsontable";

const UniverFormGenerator = ({ onDataChange, initialData = null }) => {
  const containerRef = useRef(null);
  const hotRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Initial data - create proper array of arrays
      const emptyRows = Array.from({ length: 19 }, () => ["", "", "", ""]);
      const initialSheetData = initialData || [
        ["Champ", "Type", "Obligatoire", "Description"],
        ...emptyRows,
      ];

      console.log("Initial data:", initialSheetData);

      // Destroy previous instance if exists
      if (hotRef.current) {
        hotRef.current.destroy();
      }

      // Create new Handsontable instance
      const hot = new Handsontable(containerRef.current, {
        data: initialSheetData,
        rowHeaders: true,
        colHeaders: ["A", "B", "C", "D"],
        height: "100%",
        width: "100%",
        licenseKey: "non-commercial-and-evaluation",
        contextMenu: true,
        dropdownMenu: false,
        selectionMode: "multiple",
        fillHandle: {
          autoInsertRow: false,
        },
        afterChange: (changes, source) => {
          if (source === "loadData" || source === "internal") return;
          
          // Get current data
          const currentData = hot.getSourceData();
          if (onDataChange) {
            onDataChange(currentData);
          }
        },
        afterCreateRow: () => {
          const currentData = hot.getSourceData();
          if (onDataChange) {
            onDataChange(currentData);
          }
        },
        afterRemoveRow: () => {
          const currentData = hot.getSourceData();
          if (onDataChange) {
            onDataChange(currentData);
          }
        },
        // Styling
        stretchH: "all",
        stretchV: false,
        outsideClickDeselects: false,
        autoRowSize: false,
        rowHeights: 32,
        colWidths: 150,
      });

      hotRef.current = hot;

      // Force resize to fill container
      hot.render();

      return () => {
        if (hotRef.current) {
          hotRef.current.destroy();
          hotRef.current = null;
        }
      };
    } catch (error) {
      console.error("Error initializing Handsontable:", error);
    }
  }, [onDataChange, initialData]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flex: 1,
        minHeight: 0,
      }}
    />
  );
};

export default UniverFormGenerator;
