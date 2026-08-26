import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const memberSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    // All known id variants for this person (their own `id`, `empId`, and
    // `email`). userId is the canonical one (empId-first, matching how
    // AuthContext joins that person's personal socket room), but we keep
    // the others too so real-time delivery can emit to every plausible
    // room name for them and not depend on getting exactly one id right.
    altIds: { type: [String], default: [] },
    name: { type: String, default: 'Member' },
    email: { type: String, default: '' },
    role: { type: String, default: 'Employee' },
    department: { type: String, default: '' },
    avatar: { type: String, default: '' },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.Mixed, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    avatarColor: { type: String, default: '#4f46e5' },
    createdBy: { type: String, required: true },
    // admins can edit team name/desc, remove members, delete team.
    // createdBy is always treated as an admin even if not in this array.
    admins: { type: [String], default: [] },
    members: { type: [memberSchema], default: [] },
    // FIX (team created once, shown/stored twice): client-generated id that
    // lets createTeam treat a repeated request (double-click before the
    // "Create Team" button's disabled state re-renders, a network retry,
    // etc) as a no-op instead of creating a second, genuinely distinct
    // document. Mirrors Message.clientMessageId exactly.
    clientTeamId: { type: String, default: null }
  },
  { strict: false, timestamps: true }
);

teamSchema.index({ companyId: 1, name: 1 });
teamSchema.index({ companyId: 1, 'members.userId': 1 });
teamSchema.index(
  { clientTeamId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { clientTeamId: { $type: 'string' } } }
);

teamSchema.methods.isAdmin = function (userId) {
  return this.createdBy === String(userId) || this.admins.includes(String(userId));
};

teamSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.userId === String(userId));
};

teamSchema.set('toJSON', idTransform);

export default mongoose.model('Team', teamSchema);