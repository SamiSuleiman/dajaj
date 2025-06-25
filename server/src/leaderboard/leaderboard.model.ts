// relavant for FE

export type PlayerStatsDto = {
  playerName: string;
  stats: Stats;
  matchCount?: number;
  earliestMatchDate?: string;
};

export type Stats = {
  assists: number;
  damage: number;
  headshotKills: number;
  heals: number;
  kills: number;
  knockouts: number;
  boosts: number;
  longestKill: number;
  revives: number;
  rideDistance: number;
  roadKills: number;
  swimDistance: number;
  teamKills: number;
  timeSurvived: number;
  vehicleDestroys: number;
  walkDistance: number;
  weaponsAcquired: number;
};

export type PlayerMatchStatsDto = {
  playerName: string;
  matches: {
    createdAt: string;
    stats: Stats;
  }[];
};

//

export type PlayerResponseDto = {
  data: PlayerDto[];
};

export type MatchResponseDto = {
  data: MatchDto;
  included: MatchIncludedDto[];
};

type MatchIncludedDto = ParticipantDto | RosterDto;

export type ParticipantDto = Entity<'participant'> & {
  attributes?: {
    stats?: ParticipantStatsDto;
  };
};

export type ParticipantStatsDto = {
  DBNOs: number;
  assists: number;
  boosts: number;
  damageDealt: number;
  deathType: 'alive' | 'byplayer' | 'byzone' | 'suicide' | 'logout';
  headshotKills: number;
  heals: number;
  killPlace: number;
  killStreaks: number;
  kills: number;
  longestKill: number;
  name: string;
  playerId: string;
  revives: number;
  rideDistance: number;
  roadKills: number;
  swimDistance: number;
  teamKills: number;
  timeSurvived: number;
  vehicleDestroys: number;
  walkDistance: number;
  weaponsAcquired: number;
  winPlace: number;
};

type RosterDto = {
  type: 'roster';
  id: string;
  attributes: {
    stats: {
      rank: number;
      teamId: number;
    };
    won: 'false' | 'true';
    shardId: 'steam';
  };
  relationships: {
    participants: {
      data: Entity<'participant'>[];
    };
  };
};

export type PlayerDto = {
  type: 'player';
  id: string;
  attributes: {
    name: string;
  };
};

type MatchDto = {
  type: 'match';
  id: string;
  attributes: {
    createdAt: string;
    gameMode: string;
    mapName: string;
    duration: number;
  };
};

export type PlayerSeason = {
  data: {
    relationships: {
      matchesSolo?: {
        data: Entity<'match'>[];
      };
      matchesSoloFPP?: {
        data: Entity<'match'>[];
      };
      matchesDuo?: {
        data: Entity<'match'>[];
      };
      matchesDuoFPP?: {
        data: Entity<'match'>[];
      };
      matchesSquad?: {
        data: Entity<'match'>[];
      };
      matchesSquadFPP?: {
        data: Entity<'match'>[];
      };
    };
  };
};

type Entity<T extends string> = {
  type: T;
  id: string;
};
