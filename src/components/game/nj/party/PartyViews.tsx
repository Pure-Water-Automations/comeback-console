import { useState, useMemo } from "react";
import type { PartyMember } from "@/lib/partyData";
import { spriteSrc } from "@/components/game/nj/party/partySprites";
import { cn } from "@/lib/utils";
import { NJ_PROFILE } from "@/lib/njData";
import { Grid, Layers, Network } from "lucide-react";

// Types for Org Chart Tree Nodes
interface TreeNode {
  id: string;
  name: string;
  role?: string;
  spriteFamily?: string;
  spritePose?: string;
  member?: PartyMember;
  children: TreeNode[];
}

/**
 * Leniently match a supervisor name string against a member name.
 * e.g., "John Doe (Lead Pastor)" matches "John Doe".
 */
const isMatch = (supervisorStr: string, name: string): boolean => {
  const s = (supervisorStr || "").trim().toLowerCase();
  const n = (name || "").trim().toLowerCase();
  if (!s || !n) return false;
  return s.includes(n) || n.includes(s);
};

/**
 * Assign an appropriate sprite to pastors from NJ_PROFILE for extra polish.
 */
const getPastorSprite = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("barbara") || n.includes("robertson")) {
    return { family: "mentor", pose: "mentor_full_power" };
  }
  if (n.includes("atsushi") || n.includes("takino")) {
    return { family: "mentor", pose: "mentor_chair" };
  }
  if (n.includes("jake") || n.includes("lavina")) {
    return { family: "adventurer", pose: "adventurer_victory" };
  }
  return { family: "mentor", pose: "mentor_idle" };
};

/**
 * Extract role, sprite, and canonical name for external supervisors.
 */
const getExternalSupervisorDetails = (originalStr: string) => {
  const pastor = NJ_PROFILE.pastors.find((p) =>
    originalStr.toLowerCase().includes(p.name.toLowerCase())
  );
  if (pastor) {
    const sprite = getPastorSprite(pastor.name);
    return {
      name: pastor.name,
      role: pastor.role,
      spriteFamily: sprite.family,
      spritePose: sprite.pose,
    };
  }

  // Try to parse role from parentheses, e.g. "Name (Role)"
  const match = originalStr.match(/\(([^)]+)\)/);
  const role = match ? match[1] : "Supervisor";
  const name = originalStr.replace(/\([^)]+\)/, "").trim();
  return {
    name,
    role,
    spriteFamily: "mentor",
    spritePose: "mentor_idle",
  };
};

/**
 * Color-code access levels: Full Access (teal), View Only (amber), Attendance Only (violet), else dim.
 */
const getAccessLevelStyles = (level: string) => {
  const l = (level || "").toLowerCase();
  if (l.includes("full")) {
    return {
      bg: "bg-teal-950/40",
      text: "text-teal-400",
      border: "border-teal-500/30",
      label: "Full Access",
    };
  }
  if (l.includes("view")) {
    return {
      bg: "bg-amber-950/40",
      text: "text-amber-400",
      border: "border-amber-500/30",
      label: "View Only",
    };
  }
  if (l.includes("attendance")) {
    return {
      bg: "bg-violet-950/40",
      text: "text-violet-400",
      border: "border-violet-500/30",
      label: "Attendance Only",
    };
  }
  return {
    bg: "bg-white/5",
    text: "text-white/40",
    border: "border-white/10",
    label: level || "No Access",
  };
};

/**
 * Cycle detection guard for tree building.
 */
const hasCycle = (nodeId: string, parentId: string, parentMap: Map<string, string>): boolean => {
  let curr: string | undefined = parentId;
  const visited = new Set<string>([nodeId]);
  while (curr) {
    if (visited.has(curr)) return true;
    visited.add(curr);
    curr = parentMap.get(curr);
  }
  return false;
};

// ==========================================
// Sub-components
// ==========================================

/**
 * Roster Card component
 */
function MemberCard({ member }: { member: PartyMember }) {
  const access = getAccessLevelStyles(member.accessLevel);
  const sprite = spriteSrc(member.spriteFamily, member.spritePose);

  return (
    <div className="relative border border-white/10 bg-black/60 p-5 flex flex-col gap-4 group transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] rounded-none">
      {/* Top line with Directory and Access status */}
      <div className="flex justify-between items-start gap-2">
        {member.inDirectory ? (
          <span className="text-[10px] uppercase tracking-wider font-mono text-yellow-400/90 flex items-center gap-1 font-bold">
            ★ in directory
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider font-mono text-white/30 flex items-center gap-1">
            pending directory
          </span>
        )}

        <span className={cn(
          "text-[9px] uppercase tracking-widest px-2 py-0.5 border font-mono rounded-none",
          access.bg,
          access.text,
          access.border
        )}>
          {access.label}
        </span>
      </div>

      {/* Sprite with Soft Radial Glow */}
      <div className="relative w-20 h-20 mx-auto flex items-center justify-center bg-zinc-950/80 border border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-radial from-white/5 to-transparent pointer-events-none" />
        <img
          src={sprite}
          alt={member.name}
          className="w-16 h-16 object-contain animate-float select-none"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* Information */}
      <div className="flex-1 flex flex-col justify-between text-center min-w-0">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider truncate mb-0.5">
            {member.name}
          </h3>
          <p className="text-[11px] text-white/60 truncate font-mono uppercase tracking-wide">
            {member.role || "No Title"}
          </p>
        </div>

        {member.supervisor && (
          <p className="text-[11px] text-white/40 mt-3 truncate">
            reports to <span className="text-white/60 font-medium">{member.supervisor}</span>
          </p>
        )}
      </div>

      {/* Ministry Chip */}
      <div className="mt-auto pt-3 border-t border-white/5 flex justify-center">
        <span className="text-[10px] border border-white/10 bg-white/5 px-2 py-0.5 uppercase tracking-wider font-mono text-white/70 max-w-full truncate">
          {member.ministry || "Unassigned"}
        </span>
      </div>
    </div>
  );
}

/**
 * Org Chart Tree Node Component (renders recursively)
 */
function OrgTreeNode({ node, depth = 0, maxDepth = 6 }: { node: TreeNode; depth?: number; maxDepth?: number }) {
  if (depth > maxDepth) return null;

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative flex flex-col items-start w-full">
      {/* Node Card wrapper */}
      <div className="relative group">
        <div className={cn(
          "flex items-center gap-3 p-2.5 border bg-black/60 transition-all w-72 md:w-80 rounded-none",
          node.member
            ? "border-white/10 hover:border-white/30"
            : "border-teal-500/20 bg-teal-950/10 hover:border-teal-500/40"
        )}>
          {/* Sprite container with soft glow */}
          <div className="relative w-10 h-10 flex-shrink-0 bg-zinc-950 border border-white/5 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-radial from-white/5 to-transparent pointer-events-none" />
            {node.spriteFamily && node.spritePose && (
              <img
                src={spriteSrc(node.spriteFamily, node.spritePose)}
                alt={node.name}
                className="w-8 h-8 object-contain animate-float"
                style={{ imageRendering: "pixelated" }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate uppercase tracking-wider">
              {node.name}
            </h4>
            <p className="text-[10px] text-white/50 truncate tracking-wide">
              {node.role || "Staff Member"}
            </p>
          </div>

          {!node.member && (
            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-teal-500/30 text-teal-400 bg-teal-950/40 font-mono">
              Pastor
            </span>
          )}
        </div>
      </div>

      {/* Children list recursively */}
      {hasChildren && (
        <div className="pl-6 ml-5 mt-2 space-y-3 w-full">
          {node.children.map((child, index) => {
            const isLast = index === node.children.length - 1;
            return (
              <div key={child.id} className="relative w-full">
                {/* Connector Lines */}
                {isLast ? (
                  <div className="absolute -left-6 top-0 h-[22px] w-[1px] bg-white/20" />
                ) : (
                  <div className="absolute -left-6 top-0 bottom-0 w-[1px] bg-white/20" />
                )}
                <div className="absolute -left-6 top-[22px] w-6 h-[1px] bg-white/20" />

                <OrgTreeNode node={child} depth={depth + 1} maxDepth={maxDepth} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function PartyViews({ members }: { members: PartyMember[] }) {
  const [activeTab, setActiveTab] = useState<"roster" | "ministry" | "org">("roster");

  // Empty State Guard
  if (!members || members.length === 0) {
    return (
      <div className="border border-dashed border-white/20 bg-black/60 p-12 text-center flex flex-col items-center justify-center gap-4 w-full max-w-md mx-auto rounded-none">
        <div className="w-20 h-20 flex items-center justify-center bg-zinc-950/80 border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-radial from-teal-500/10 to-transparent pointer-events-none" />
          <img
            src={spriteSrc("npc", "npc_wave")}
            alt="Welcome NPC"
            className="w-16 h-16 object-contain animate-float"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">
            No party members yet
          </h3>
          <p className="text-xs text-white/50 max-w-xs font-mono leading-relaxed">
            Add your first staffer to view and organize your ministry team roster.
          </p>
        </div>
      </div>
    );
  }

  // 1. ROSTER view processing - sorted alphabetically by name
  const rosterMembers = useMemo(() => {
    return [...members].sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  // 2. BY MINISTRY view processing
  const ministryGroups = useMemo(() => {
    const grouped: Record<string, PartyMember[]> = {};
    members.forEach((m) => {
      const min = (m.ministry || "").trim() || "Unassigned";
      if (!grouped[min]) grouped[min] = [];
      grouped[min].push(m);
    });

    const sortedMinistries = Object.keys(grouped).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });

    return sortedMinistries.map((name) => ({
      name,
      membersList: [...grouped[name]].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [members]);

  // 3. ORG CHART view processing
  const orgChartRoots = useMemo(() => {
    // A Map of all members
    const nodesMap = new Map<string, TreeNode>();
    members.forEach((m) => {
      nodesMap.set(m.id, {
        id: m.id,
        name: m.name,
        role: m.role,
        spriteFamily: m.spriteFamily,
        spritePose: m.spritePose,
        member: m,
        children: [],
      });
    });

    // A Map of external supervisors (referenced as supervisor but not in the roster)
    const externalNodesMap = new Map<string, TreeNode>();
    members.forEach((m) => {
      const sup = (m.supervisor || "").trim();
      if (sup) {
        const matchesMember = members.some((member) => isMatch(sup, member.name));
        if (!matchesMember) {
          const details = getExternalSupervisorDetails(sup);
          const canonicalKey = details.name.toLowerCase();
          if (!externalNodesMap.has(canonicalKey)) {
            externalNodesMap.set(canonicalKey, {
              id: `ext-${canonicalKey}`,
              name: details.name,
              role: details.role,
              spriteFamily: details.spriteFamily,
              spritePose: details.spritePose,
              children: [],
            });
          }
        }
      }
    });

    // Helper to find a node's parent (either in member list or external list)
    const getParentNode = (supervisorStr: string): TreeNode | undefined => {
      const s = supervisorStr.trim();
      if (!s) return undefined;

      const memberParent = members.find((m) => isMatch(s, m.name));
      if (memberParent) {
        return nodesMap.get(memberParent.id);
      }

      const details = getExternalSupervisorDetails(s);
      const canonicalKey = details.name.toLowerCase();
      return externalNodesMap.get(canonicalKey);
    };

    // Track links for cycle prevention
    const parentMap = new Map<string, string>(); // childNodeId -> parentNodeId

    // Populate children lists
    members.forEach((m) => {
      const sup = (m.supervisor || "").trim();
      if (sup) {
        const parentNode = getParentNode(sup);
        if (parentNode && parentNode.id !== m.id) {
          if (!hasCycle(m.id, parentNode.id, parentMap)) {
            parentNode.children.push(nodesMap.get(m.id)!);
            parentMap.set(m.id, parentNode.id);
          }
        }
      }
    });

    // Roots are external supervisors plus member nodes with no parent
    const roots: TreeNode[] = [];
    externalNodesMap.forEach((node) => {
      // Sort children alphabetically
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      roots.push(node);
    });

    nodesMap.forEach((node) => {
      if (!parentMap.has(node.id)) {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
        roots.push(node);
      }
    });

    // Sort roots: pastors first, then others alphabetically
    return roots.sort((a, b) => {
      const aIsPastor = !a.member;
      const bIsPastor = !b.member;
      if (aIsPastor && !bIsPastor) return -1;
      if (!aIsPastor && bIsPastor) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [members]);

  const TABS = [
    { id: "roster", label: "Roster", icon: Grid },
    { id: "ministry", label: "By Ministry", icon: Layers },
    { id: "org", label: "Org Chart", icon: Network },
  ] as const;

  return (
    <div className="w-full flex flex-col gap-6 text-white">
      {/* Segmented Control Toggle */}
      <div className="flex flex-col items-center w-full">
        <div className="inline-flex border border-white/10 bg-black/60 p-1 rounded-none">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 text-xs uppercase tracking-widest font-mono font-medium transition-all duration-200 cursor-pointer rounded-none border border-transparent",
                  isActive
                    ? "bg-white/10 text-white shadow-[0_0_12px_rgba(255,255,255,0.05)] border-white/10"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Views Container */}
      <div className="w-full">
        {/* 1. ROSTER VIEW */}
        {activeTab === "roster" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {rosterMembers.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}

        {/* 2. BY MINISTRY VIEW */}
        {activeTab === "ministry" && (
          <div className="space-y-10">
            {ministryGroups.map((group) => (
              <section key={group.name} className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                  <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-white/95">
                    {group.name}
                  </h2>
                  <span className="text-[10px] font-mono border border-white/10 bg-white/5 px-2 py-0.5 text-white/50 rounded-none">
                    {group.membersList.length} {group.membersList.length === 1 ? "member" : "members"}
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {group.membersList.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* 3. ORG CHART VIEW */}
        {activeTab === "org" && (
          <div className="space-y-8 w-full max-w-2xl mx-auto flex flex-col items-center">
            {orgChartRoots.map((root) => (
              <div
                key={root.id}
                className="border border-white/5 bg-zinc-950/20 p-6 w-full rounded-none flex flex-col items-start gap-4"
              >
                <OrgTreeNode node={root} depth={0} maxDepth={6} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
