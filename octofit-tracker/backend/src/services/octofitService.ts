import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

export async function listActivities() {
  return Activity.find().lean();
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function notFound(message: string) {
  return Object.assign(new Error(message), { status: 404 });
}

function objectRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('Invalid activity input');
  }
  return input as Record<string, unknown>;
}

export async function createActivity(input: unknown) {
  const record = objectRecord(input);
  const userId = record.userId;
  const teamId = record.teamId;
  const type = record.type;
  const minutes = record.minutes;

  if (
    typeof userId !== 'string'
    || typeof teamId !== 'string'
    || !mongoose.Types.ObjectId.isValid(userId)
    || !mongoose.Types.ObjectId.isValid(teamId)
  ) {
    throw badRequest('A valid userId and teamId are required');
  }
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw badRequest('Activity type is required');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw badRequest('Minutes must be a positive number');
  }

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);
  if (!user || !team) {
    throw notFound('User or team was not found');
  }

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('Invalid team input');
  }
  const record = input as Record<string, unknown>;
  const name = record.name;
  const mascot = record.mascot;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw badRequest('Team name is required');
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw badRequest('Team mascot is required');
  }

  const rawMembers = record.members ?? [];
  if (!Array.isArray(rawMembers)) {
    throw badRequest('Team members must be an array');
  }
  const memberIds = rawMembers.filter((member): member is string => typeof member === 'string');
  if (memberIds.length !== rawMembers.length || memberIds.some((member) => !mongoose.Types.ObjectId.isValid(member))) {
    throw badRequest('Team members must contain valid user IDs');
  }

  const uniqueMemberIds = [...new Set(memberIds)];
  const users = await User.find({ _id: { $in: uniqueMemberIds } }).select('_id').lean();
  if (users.length !== uniqueMemberIds.length) {
    throw notFound('One or more team members were not found');
  }

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: uniqueMemberIds,
  });
  await Team.updateMany(
    { _id: { $ne: team._id }, members: { $in: uniqueMemberIds } },
    { $pull: { members: { $in: uniqueMemberIds } } },
  );
  await User.updateMany(
    { _id: { $in: uniqueMemberIds } },
    { $set: { team: team._id } },
  );
  return team.toObject();
}

export async function getLeaderboard() {
  const activities = await Activity.find().lean();
  const teamIds = [...new Set(activities.map((activity) => activity.team.toString()))];
  const teams = await Team.find({ _id: { $in: teamIds } }).lean();
  const teamNames = new Map(teams.map((team) => [team._id.toString(), team.name]));
  const totals = new Map<string, number>();

  for (const activity of activities) {
    const teamId = activity.team.toString();
    totals.set(teamId, (totals.get(teamId) ?? 0) + activity.points);
  }

  let previousPoints: number | undefined;
  let previousRank = 0;
  return [...totals.entries()]
    .filter(([teamId]) => teamNames.has(teamId))
    .map(([teamId, totalPoints]) => ({
      teamName: teamNames.get(teamId) as string,
      totalPoints,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => {
      if (entry.totalPoints !== previousPoints) {
        previousRank = index + 1;
        previousPoints = entry.totalPoints;
      }
      return { ...entry, rank: previousRank };
    });
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw notFound('User was not found');
  }

  const activities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const latestActivityType = activities[0]?.type.toLowerCase();
  let focus = user.fitnessGoal;

  if (latestActivityType === 'run' || latestActivityType === 'cycle' || latestActivityType === 'walk') {
    focus = 'endurance';
  } else if (latestActivityType === 'strength') {
    focus = 'strength';
  }

  const workouts = await Workout.find().lean();
  const matching = workouts.filter((workout) => workout.focus.toLowerCase() === focus.toLowerCase());
  const selected = matching.length > 0 ? matching[0] : workouts[0];
  if (!selected) {
    return [];
  }

  const reason = matching.length > 0
    ? `Matches your ${focus} activity pattern`
    : 'Matches your overall activity profile';
  return [{ ...selected, reason }];
}

export { User };
