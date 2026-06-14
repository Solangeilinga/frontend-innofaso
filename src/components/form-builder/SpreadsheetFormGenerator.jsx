import React, { useEffect, useRef, useState } from "react";

const SpreadsheetFormGenerator = ({ onDataChange, initialData = null }) => {
  const [cells, setCells] = useState({
    "0_0": "Champ",
    "0_1": "Type",
    "0_2": "Obligatoire",
    "0_3": "Description"
  });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");

  const rows = 20;
  const columns = 26; // A-Z
  const colLetters = Array.from({ length: columns }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  const handleCellClick = (row, col) => {
    const key = `${row}_${col}`;
    setEditingCell(key);
    setEditValue(cells[key] || "");
  };

  const handleCellChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleCellBlur = () => {
    if (editingCell) {
      setCells({
        ...cells,
        [editingCell]: editValue
      });
      setEditingCell(null);
      if (onDataChange) {
        onDataChange(cells);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCellBlur();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "600px",
        border: "1px solid #e5e7eb",
        borderRadius: "0.5rem",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        overflow: "hidden"
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          backgroundColor: "#1e3a1f",
          color: "white",
          padding: "10px 12px",
          fontWeight: "600",
          fontSize: "14px"
        }}
      >
        Luckysheet - Générateur de Formulaires
      </div>

      {/* Spreadsheet */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          backgroundColor: "#fafafa"
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            backgroundColor: "white",
            width: "100%",
            minWidth: "1000px"
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  width: "50px",
                  textAlign: "center",
                  fontWeight: "600",
                  color: "#6b7280",
                  backgroundColor: "#f9fafb",
                  position: "sticky",
                  left: 0,
                  zIndex: 2
                }}
              ></th>
              {colLetters.map((col, i) => (
                <th
                  key={i}
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    width: "100px",
                    textAlign: "center",
                    fontWeight: "600",
                    color: "#374151",
                    backgroundColor: "#f3f4f6",
                    minWidth: "100px"
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, row) => (
              <tr key={row}>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "0",
                    width: "50px",
                    textAlign: "center",
                    fontWeight: "600",
                    backgroundColor: "#f9fafb",
                    color: "#6b7280",
                    fontSize: "12px",
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    userSelect: "none"
                  }}
                >
                  {row + 1}
                </td>
                {colLetters.map((col, colIdx) => {
                  const key = `${row}_${colIdx}`;
                  const isEditing = editingCell === key;
                  const value = cells[key] || "";

                  return (
                    <td
                      key={colIdx}
                      onClick={() => handleCellClick(row, colIdx)}
                      style={{
                        border: "1px solid #d1d5db",
                        padding: isEditing ? "0" : "8px",
                        minWidth: "100px",
                        cursor: "cell",
                        backgroundColor: isEditing ? "#dbeafe" : row === 0 ? "#f0fdf4" : "white",
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: "13px"
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          value={editValue}
                          onChange={handleCellChange}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                            padding: "8px",
                            fontFamily: "DM Sans, sans-serif",
                            fontSize: "13px",
                            outline: "none"
                          }}
                        />
                      ) : (
                        <span style={{ display: "block", minHeight: "20px" }}>
                          {value}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpreadsheetFormGenerator;
