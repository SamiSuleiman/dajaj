import {
  PlayerStatsDto,
  Stats,
  MatchResponseDto,
  ParticipantDto,
  PlayerMatchStatsDto,
} from './leaderboard.model';

export class LeaderboardMapper {
  static toPlayerMatchStatsDto(
    playerId: string,
    playerName: string,
    matches: MatchResponseDto[],
  ): PlayerMatchStatsDto {
    const playerStatsFromMatches = matches.flatMap((match) => {
      const playerStats = match.included.filter(
        (included): included is ParticipantDto => {
          return (
            included.type === 'participant' &&
            included.attributes.stats.playerId === playerId
          );
        },
      );

      return playerStats.map((playerStat) => ({
        stats: playerStat.attributes.stats,
        createdAt: match.data.attributes.createdAt,
      }));
    });

    return {
      playerName: playerName,
      matches: playerStatsFromMatches.map((playerStat) => ({
        createdAt: playerStat.createdAt,
        stats: {
          boosts: playerStat.stats.boosts,
          knockouts: playerStat.stats.DBNOs,
          assists: playerStat.stats.assists,
          damage: playerStat.stats.damageDealt,
          headshotKills: playerStat.stats.headshotKills,
          heals: playerStat.stats.heals,
          kills: playerStat.stats.kills,
          longestKill: playerStat.stats.longestKill,
          revives: playerStat.stats.revives,
          rideDistance: playerStat.stats.rideDistance,
          roadKills: playerStat.stats.roadKills,
          swimDistance: playerStat.stats.swimDistance,
          teamKills: playerStat.stats.teamKills,
          timeSurvived: playerStat.stats.timeSurvived,
          vehicleDestroys: playerStat.stats.vehicleDestroys,
          walkDistance: playerStat.stats.walkDistance,
          weaponsAcquired: playerStat.stats.weaponsAcquired,
        },
      })),
    };
  }

  static toLeaderboardDto(
    playerId: string,
    playerName: string,
    matches: MatchResponseDto[],
  ): PlayerStatsDto {
    const playerStatsFromMatches = matches.flatMap((match) => {
      const playerStats = match.included.filter(
        (included): included is ParticipantDto => {
          return (
            included.type === 'participant' &&
            included.attributes.stats.playerId === playerId
          );
        },
      );

      return playerStats.map((playerStat) => playerStat.attributes.stats);
    });

    const stats: Stats = playerStatsFromMatches.reduce(
      (acc, curr) => {
        return {
          boosts: acc.boosts + curr.boosts,
          knockouts: acc.knockouts + curr.DBNOs,
          assists: acc.assists + curr.assists,
          damage: acc.damage + curr.damageDealt,
          headshotKills: acc.headshotKills + curr.headshotKills,
          heals: acc.heals + curr.heals,
          kills: acc.kills + curr.kills,
          longestKill: Math.max(acc.longestKill, curr.longestKill),
          revives: acc.revives + curr.revives,
          rideDistance: acc.rideDistance + curr.rideDistance,
          roadKills: acc.roadKills + curr.roadKills,
          swimDistance: acc.swimDistance + curr.swimDistance,
          teamKills: acc.teamKills + curr.teamKills,
          timeSurvived: acc.timeSurvived + curr.timeSurvived,
          vehicleDestroys: acc.vehicleDestroys + curr.vehicleDestroys,
          walkDistance: acc.walkDistance + curr.walkDistance,
          weaponsAcquired: acc.weaponsAcquired + curr.weaponsAcquired,
        } as Stats;
      },
      {
        boosts: 0,
        knockouts: 0,
        assists: 0,
        damage: 0,
        headshotKills: 0,
        heals: 0,
        kills: 0,
        longestKill: 0,
        revives: 0,
        rideDistance: 0,
        roadKills: 0,
        swimDistance: 0,
        teamKills: 0,
        timeSurvived: 0,
        vehicleDestroys: 0,
        walkDistance: 0,
        weaponsAcquired: 0,
      },
    );

    return {
      playerName,
      stats,
    };
  }
}
