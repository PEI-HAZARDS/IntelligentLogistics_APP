import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export type Arrival = {
  id: string;
  number?: string;
  datetime: string; // ISO or display
  status: string;
  dock?: string;
  plate: string;
  cargo: string;
  quantity?: string;
  adr?: string;
  company?: string;
  driver?: string;
  contact?: string;
  description?: string;
  history?: { id: string; title: string; text: string }[];
};

export default function ArrivalCard({ item }: { item: Arrival }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`arrival-card ${open ? 'open' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="arrival-summary" onClick={() => setOpen(!open)} style={{ cursor: 'pointer', flex: 1 }}>
          <div className="arrival-top">
            <div><strong>Matrícula:</strong> {item.plate}</div>
            <div><strong>Hora prevista:</strong> {item.datetime}</div>
          </div>
          <div className="arrival-bottom">
            <div><strong>Carga:</strong> {item.cargo} {item.quantity ? `(${item.quantity})` : ''}</div>
            <div><strong>Estado:</strong> {item.status}</div>
            <div><strong>Cais:</strong> {item.dock}</div>
          </div>
        </div>

        {/* link para ver detalhe completo (rota /gate/arrival/:id) */}
        <div style={{ marginLeft: 12 }}>
          <Link to={`/gate/arrival/${item.id}`} className="open-detail-link" aria-label="Abrir detalhe">
            <button style={{ border: 'none', background: '#f0f0f0', padding: 8, borderRadius: 8 }}>Abrir</button>
          </Link>
        </div>
      </div>

      {open && (
        <div className="arrival-detail">
          <header className="detail-header">
            <div>
              <h3>Chegada {item.number ? `#${item.number}` : ''}</h3>
              <small>{item.datetime} — <em>{item.status}</em></small>
            </div>
            <div className="detail-actions">
              <button className="outline">Prevista</button>
              <button className="accent">Em descarga</button>
              <button className="outline">Finalizada</button>
            </div>
          </header>

          <div className="detail-grid">
            <div className="detail-col">
              <div className="detail-box">
                <div className="label">Hora prevista / Hora de chegada</div>
                <div className="value">{item.datetime}</div>
              </div>

              <div className="detail-box">
                <div className="label">Carga</div>
                <div className="value">{item.cargo}</div>
              </div>

              <div className="detail-box">
                <div className="label">Quantidade</div>
                <div className="value">{item.quantity}</div>
              </div>

              <div className="detail-box">
                <div className="label">ADR</div>
                <div className="value">{item.adr}</div>
              </div>
            </div>

            <div className="detail-col">
              <div className="detail-box">
                <div className="label">Estado da Descarga</div>
                <div className="value">{item.status}</div>
              </div>

              <div className="detail-box">
                <div className="label">Tipo Carga</div>
                <div className="value">{item.cargo}</div>
              </div>

              <div className="detail-box">
                <div className="label">Estado Físico</div>
                <div className="value">Líquido</div>
              </div>

              <div className="detail-box">
                <div className="label">Detecção associada</div>
                <div className="value">Detection#{item.id}</div>
              </div>
            </div>

            <div className="detail-col">
              <div className="detail-box">
                <div className="label">Matrícula</div>
                <div className="value">{item.plate}</div>
              </div>

              <div className="detail-box">
                <div className="label">Empresa</div>
                <div className="value">{item.company}</div>
              </div>

              <div className="detail-box">
                <div className="label">Condutor</div>
                <div className="value">{item.driver}</div>
              </div>

              <div className="detail-box">
                <div className="label">Contacto</div>
                <div className="value">{item.contact}</div>
              </div>
            </div>
          </div>

          {item.description && (
            <div className="detail-desc">
              <h4>Descrição e Anotações</h4>
              <p>{item.description}</p>
            </div>
          )}

          {item.history?.length ? (
            <div className="history-list">
              <h4>Histórico de Ocorrências</h4>
              {item.history.map(h => (
                <div className="history-item" key={h.id}>
                  <div className="history-dot" />
                  <div>
                    <strong>{h.title}</strong>
                    <div className="history-text">{h.text}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}