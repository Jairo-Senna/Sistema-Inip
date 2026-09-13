import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { 
  Network, 
  List, 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Search,
  Building2,
  User,
  MapPin,
  Car,
  Globe,
  HelpCircle
} from 'lucide-react';
import { 
  CaseData, 
  InvolvedEntity, 
  CaseConnection, 
  ConnectionType 
} from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { addConnection, deleteConnection } from '../../../services/casesService';

interface ConnectionsGraphTabProps {
  caseData: CaseData;
  involved: InvolvedEntity[];
  connections: CaseConnection[];
  onRefresh: () => void;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  classification: string;
  x?: number;
  y?: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  source: D3Node | string;
  target: D3Node | string;
  type: ConnectionType;
  label: string;
  notes?: string;
}

export const ConnectionsGraphTab: React.FC<ConnectionsGraphTabProps> = ({
  caseData,
  involved,
  connections,
  onRefresh,
}) => {
  const { userProfile, canModifyCase } = useAuth();
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [selectedNode, setSelectedNode] = useState<InvolvedEntity | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [connectionType, setConnectionType] = useState<ConnectionType>('socio_de');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');

  // SVG ref for D3
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const allowedToEdit = canModifyCase(caseData.status);

  const openNewModal = () => {
    setSourceId(involved[0]?.id || '');
    setTargetId(involved[1]?.id || involved[0]?.id || '');
    setConnectionType('socio_de');
    setLabel('Sócio Administrador');
    setNotes('');
    setModalOpen(true);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (sourceId === targetId) {
      alert('Selecione entidades distintas para a conexão.');
      return;
    }
    setLoading(true);

    try {
      await addConnection(
        caseData.id,
        {
          sourceId,
          targetId,
          type: connectionType,
          label: label.trim() || connectionType.replace('_', ' '),
          notes: notes.trim(),
        },
        userProfile
      );
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Save connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnection = async (connId: string) => {
    if (!userProfile) return;
    if (confirm('Remover esta conexão investigativa?')) {
      try {
        await deleteConnection(caseData.id, connId, userProfile);
        onRefresh();
      } catch (err) {
        console.error('Delete connection error:', err);
      }
    }
  };

  // D3 Force Simulation
  useEffect(() => {
    if (viewMode !== 'graph' || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 550;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Create container for zoom/pan
    const g = svg.append('g');

    // Zoom setup
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Node data mapping
    const nodes: D3Node[] = involved.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      classification: d.classification,
    }));

    // Link data mapping (ensure both endpoints exist in nodes)
    const validNodeIds = new Set(nodes.map((n) => n.id));
    const links: D3Link[] = connections
      .filter((c) => validNodeIds.has(c.sourceId) && validNodeIds.has(c.targetId))
      .map((c) => ({
        id: c.id,
        source: c.sourceId,
        target: c.targetId,
        type: c.type,
        label: c.label,
        notes: c.notes,
      }));

    if (nodes.length === 0) return;

    // Arrow markers
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    // Force simulation
    const simulation = d3
      .forceSimulation<D3Node>(nodes)
      .force(
        'link',
        d3
          .forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance(150)
      )
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(45));

    // Draw links
    const linkGroup = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#64748b')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8)
      .attr('marker-end', 'url(#arrow)');

    // Link text labels
    const linkLabels = g
      .append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#0284c7')
      .attr('text-anchor', 'middle')
      .attr('dy', -4);

    // Draw nodes
    const nodeGroup = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(
        d3
          .drag<SVGGElement, D3Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_, d) => {
        const found = involved.find((inv) => inv.id === d.id);
        if (found) setSelectedNode(found);
      });

    // Node circles with colors based on classification
    nodeGroup
      .append('circle')
      .attr('r', 20)
      .attr('fill', (d) => {
        switch (d.classification) {
          case 'principal':
            return '#ef4444'; // Red for primary suspect
          case 'em_analise':
            return '#f59e0b'; // Amber for under investigation
          case 'vitima':
            return '#10b981'; // Green for victim
          case 'testemunha':
            return '#06b6d4'; // Cyan for witness
          default:
            return '#6366f1'; // Indigo for other
        }
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .attr('cursor', 'pointer');

    // Node initials or text
    nodeGroup
      .append('text')
      .text((d) => d.name.substring(0, 2).toUpperCase())
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('pointer-events', 'none');

    // Node labels below
    nodeGroup
      .append('text')
      .text((d) => (d.name.length > 16 ? d.name.substring(0, 14) + '...' : d.name))
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#0f172a')
      .attr('text-anchor', 'middle')
      .attr('dy', 34)
      .attr('class', 'dark:fill-slate-200 pointer-events-none');

    // Simulation tick handler
    simulation.on('tick', () => {
      linkGroup
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabels
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [viewMode, involved, connections]);

  const handleZoom = (scaleFactor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, scaleFactor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'empresa':
        return <Building2 className="w-4 h-4 text-purple-500" />;
      case 'local':
        return <MapPin className="w-4 h-4 text-emerald-500" />;
      case 'veiculo':
        return <Car className="w-4 h-4 text-amber-500" />;
      case 'perfil_digital':
        return <Globe className="w-4 h-4 text-sky-500" />;
      default:
        return <User className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Mode switch */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
                viewMode === 'graph'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Grafo Interativo</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista de Vínculos ({connections.length})</span>
            </button>
          </div>
        </div>

        {allowedToEdit && involved.length >= 2 && (
          <button
            onClick={openNewModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition"
            id="btn-new-connection"
          >
            <Plus className="w-4 h-4" />
            <span>NOVA CONEXÃO</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'graph' ? (
        <div className="relative grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* SVG Canvas Area */}
          <div
            ref={containerRef}
            className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs h-[550px] relative overflow-hidden flex items-center justify-center"
          >
            {involved.length === 0 ? (
              <div className="text-center p-8 text-slate-400">
                <Network className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Sem entidades suficientes para traçar grafo.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Cadastre envolvidos na aba &quot;Envolvidos&quot; para visualização dos relacionamentos.
                </p>
              </div>
            ) : (
              <>
                <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

                {/* Floating zoom controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => handleZoom(1.3)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-sky-600 rounded transition"
                    title="Aproximar (Zoom In)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleZoom(0.7)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-sky-600 rounded transition"
                    title="Afastar (Zoom Out)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-sky-600 rounded transition"
                    title="Resetar Enquadramento"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Legend pill */}
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 text-[10px] font-bold bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-2 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Principal
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Em Análise
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Vítima
                  </span>
                  <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Testemunha
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right Inspector Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 tracking-wider">
                    Entidade em Foco
                  </span>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Fechar
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {getNodeIcon(selectedNode.type)}
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedNode.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {selectedNode.classification}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {selectedNode.phone && <p><strong>Telefone:</strong> {selectedNode.phone}</p>}
                  {selectedNode.email && <p><strong>E-mail:</strong> {selectedNode.email}</p>}
                  {selectedNode.address && <p><strong>Endereço:</strong> {selectedNode.address}</p>}
                  {selectedNode.notes && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-[11px]">
                      <strong>Anotações:</strong> {selectedNode.notes}
                    </div>
                  )}
                </div>

                {/* Direct Connections of this node */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                    Conexões Diretas
                  </span>
                  <div className="space-y-1 text-xs">
                    {connections
                      .filter((c) => c.sourceId === selectedNode.id || c.targetId === selectedNode.id)
                      .map((c) => {
                        const otherId = c.sourceId === selectedNode.id ? c.targetId : c.sourceId;
                        const other = involved.find((inv) => inv.id === otherId);
                        return (
                          <div
                            key={c.id}
                            className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded flex items-center justify-between text-[11px]"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {other?.name || 'Entidade'}
                            </span>
                            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono">
                              {c.label}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nenhum nó selecionado
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Clique em um vértice do grafo para inspecionar atributos e ramificações investigativas.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List Mode */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="p-3">Origem</th>
                <th className="p-3">Tipo de Vínculo</th>
                <th className="p-3">Destino</th>
                <th className="p-3">Observações</th>
                {allowedToEdit && <th className="p-3 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {connections.map((c) => {
                const s = involved.find((i) => i.id === c.sourceId);
                const t = involved.find((i) => i.id === c.targetId);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {s?.name || 'Desconhecido'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        {c.label || c.type}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {t?.name || 'Desconhecido'}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {c.notes || '—'}
                    </td>
                    {allowedToEdit && (
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteConnection(c.id)}
                          className="p-1 text-rose-400 hover:text-rose-600 rounded transition"
                          title="Remover Conexão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Connection */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Estabelecer Vínculo / Conexão Investigativa
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConnection} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Entidade Origem *
                  </label>
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {involved.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.classification})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Entidade Destino *
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {involved.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.classification})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Natureza da Relação *
                </label>
                <select
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="socio_de">Sócio de / Participação Societária</option>
                  <option value="trabalha_com">Trabalha com / Vínculo Empregatício</option>
                  <option value="familiar_de">Familiar / Grau de Parentesco</option>
                  <option value="contato_de">Contato Telefônico / Digital Recorrente</option>
                  <option value="associado_a">Associado a / Encontro Comprovado</option>
                  <option value="telefone_relacionado">Uso de Linha Telefônica Vinculada</option>
                  <option value="endereco_relacionado">Mesmo Endereço / Sede Comum</option>
                  <option value="veiculo_relacionado">Condutor / Posse de Veículo</option>
                  <option value="personalizado">Vínculo Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rótulo Visual da Conexão *
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Sócio Administrador (60% quotas)"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Anotações / Fonte Probatória
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Contrato social arquivado na JUCESP sob o nº 35.221..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm"
                >
                  {loading ? 'Salvando...' : 'Adicionar Conexão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
