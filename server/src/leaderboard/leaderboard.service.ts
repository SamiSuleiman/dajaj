import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { Cache } from 'cache-manager';
import {
  catchError,
  defaultIfEmpty,
  filter,
  forkJoin,
  from,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  MS_TIME,
  PUBG_ACCEPT_HEADER,
  PUBG_API_URL,
} from './leaderboard.consts';
import { LeaderboardMapper } from './leaderboard.mapper';
import {
  MatchResponseDto,
  PlayerDto,
  PlayerMatchStatsDto,
  PlayerResponseDto,
  PlayerSeason,
  PlayerStatsDto,
} from './leaderboard.model';

// todo: make caching logic more generic (not retarded)
@Injectable()
export class LeaderboardService {
  private readonly apiKey =
    this.configService.getOrThrow<string>('PUBG_API_KEY');
  private readonly validPlayers = this.getAvailablePlayers();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  fetchLeaderboard$(playerNames: string[]): Observable<PlayerStatsDto[]> {
    return this.fetchPlayersWithMathes$(playerNames).pipe(
      map((players) => {
        const matches = Array.from(
          new Set(...players.map((player) => player.matches)),
        );

        const matchCount = matches.length;
        const earliestMatchDate = matches.sort(
          (a, b) =>
            new Date(a.data.attributes.createdAt).getTime() -
            new Date(b.data.attributes.createdAt).getTime(),
        )[0]?.data?.attributes?.createdAt;

        return players.map((player) => ({
          ...LeaderboardMapper.toLeaderboardDto(
            player.playerId,
            player.playerName,
            matches,
          ),
          earliestMatchDate,
          matchCount,
        }));
      }),
    );
  }

  fetchPlayerMatchStats$(
    playerNames: string[],
  ): Observable<PlayerMatchStatsDto[]> {
    return this.fetchPlayersWithMathes$(playerNames).pipe(
      map((players) =>
        players.map((player) =>
          LeaderboardMapper.toPlayerMatchStatsDto(
            player.playerId,
            player.playerName,
            Array.from(new Set(...players.map((player) => player.matches))),
          ),
        ),
      ),
    );
  }

  getValidPlayers(): string[] {
    return this.validPlayers;
  }

  arePlayerNamesValid(playerName: string[]): boolean {
    return playerName.every((name) => this.validPlayers.includes(name));
  }

  private fetchPlayerLifetimeStats$(
    accountId: string,
  ): Observable<PlayerSeason> {
    return from(
      this.cacheManager.get<PlayerSeason>(
        `players.${accountId}.seasons.lifetime`,
      ),
    ).pipe(
      switchMap((cachedStats) => {
        if (!!cachedStats) {
          Logger.debug(
            `[CACHE HIT] players.${accountId}.seasons.lifetime -- [fetching from cache]`,
            LeaderboardService.name,
          );
          return of(cachedStats);
        } else
          return this.httpService
            .get<PlayerSeason>(
              `${PUBG_API_URL}/players/${accountId}/seasons/lifetime`,
              {
                headers: {
                  Accept: PUBG_ACCEPT_HEADER,
                  Authorization: `Bearer ${this.apiKey}`,
                },
              },
            )
            .pipe(
              filter((response) => !!response?.data?.data),
              map((response) => response.data),
              tap(async (data) => {
                Logger.debug(
                  `[CACHE MISS] players.${accountId}.seasons.lifetime [fetching from API]`,
                  LeaderboardService.name,
                );
                await this.cacheManager.set(
                  `players.${accountId}.seasons.lifetime`,
                  data,
                  MS_TIME.MINUTE * 20,
                );
              }),
              catchError((error: AxiosError) => {
                Logger.error(
                  error.message,
                  error.stack,
                  LeaderboardService.name,
                );
                return of(null);
              }),
            );
      }),
    );
  }

  private fetchPlayersLifetimeStats$(accountIds: string[]): Observable<
    {
      accountId: string;
      stats: PlayerSeason;
    }[]
  > {
    return forkJoin(
      accountIds.map((accountId) =>
        this.fetchPlayerLifetimeStats$(accountId).pipe(
          map((stats) => ({
            accountId,
            stats,
          })),
        ),
      ),
    ).pipe(defaultIfEmpty([]));
  }

  private getAllMatchIdsFromPlayerSeason(season: PlayerSeason): string[] {
    return [
      ...(season?.data?.relationships?.matchesSolo?.data?.map(
        (match) => match.id,
      ) ?? []),
      ...(season?.data?.relationships?.matchesSoloFPP?.data?.map(
        (match) => match.id,
      ) ?? []),
      ...(season?.data?.relationships?.matchesDuo?.data?.map(
        (match) => match.id,
      ) ?? []),
      ...(season?.data?.relationships?.matchesDuoFPP?.data?.map(
        (match) => match.id,
      ) ?? []),
      ...(season?.data?.relationships?.matchesSquad?.data?.map(
        (match) => match.id,
      ) ?? []),
      ...(season?.data?.relationships?.matchesSquadFPP?.data?.map(
        (match) => match.id,
      ) ?? []),
    ];
  }

  private fetchPlayersWithMathes$(playerNames: string[]): Observable<
    {
      playerId: string;
      playerName: string;
      matches: MatchResponseDto[];
    }[]
  > {
    return this.fetchPlayers$(playerNames).pipe(
      filter((players) => !!players),
      switchMap((players) => {
        return this.fetchPlayersLifetimeStats$(
          players.map((player) => player.id),
        ).pipe(
          map((playersStats) => {
            return {
              players,
              playersStats,
            };
          }),
        );
      }),
      switchMap((playersAndLifetimeStats) => {
        const playersWithMatchIds = playersAndLifetimeStats.players.map(
          (player) => ({
            playerId: player.id,
            playerName: player.attributes.name,
            matches: this.getAllMatchIdsFromPlayerSeason(
              playersAndLifetimeStats.playersStats.find(
                (s) => s.accountId === player.id,
              ).stats,
            ),
          }),
        );
        return forkJoin(
          playersWithMatchIds.map((player) => {
            return this.fetchMatches$(player.matches).pipe(
              map((matches) => ({
                playerId: player.playerId,
                playerName: player.playerName,
                matches: matches.filter((match) =>
                  this.doesMatchContainPlayers(
                    match,
                    playersAndLifetimeStats.players.map((p) => p.id),
                  ),
                ),
              })),
            );
          }),
        );
      }),
      defaultIfEmpty([]),
    );
  }

  private doesMatchContainPlayers(
    match: MatchResponseDto,
    playerIds: string[],
  ): boolean {
    return playerIds.every((playerId) =>
      match.included.some(
        (included) =>
          included.type === 'participant' &&
          included.attributes.stats.playerId === playerId,
      ),
    );
  }

  private fetchPlayers$(playerNames: string[]): Observable<PlayerDto[]> {
    const url =
      `${PUBG_API_URL}/players?filter[playerNames]=` + playerNames.join(',');

    return from(this.cacheManager.get<PlayerDto[]>('players')).pipe(
      switchMap((cachedPlayers) => {
        if (
          !!cachedPlayers &&
          playerNames.every((name) =>
            cachedPlayers.some((player) => player.attributes.name === name),
          )
        )
          return of(cachedPlayers).pipe(
            tap(() =>
              Logger.debug(
                '[CACHE HIT] players [fetching from cache]',
                LeaderboardService.name,
              ),
            ),
            map((data) =>
              data.filter((player) =>
                playerNames.includes(player.attributes.name),
              ),
            ),
          );
        else {
          return this.httpService
            .get<PlayerResponseDto>(url, {
              headers: {
                Accept: PUBG_ACCEPT_HEADER,
                Authorization: `Bearer ${this.apiKey}`,
              },
            })
            .pipe(
              filter((response) => !!response?.data?.data),
              map((response) => response.data.data),
              tap(async (data) => {
                Logger.debug(
                  '[CACHE MISS] players [fetching from API]',
                  LeaderboardService.name,
                );
                await this.cacheManager.set('players', data, MS_TIME.WEEK * 10);
              }),
              catchError((error: AxiosError) => {
                Logger.error(
                  error.message,
                  error.stack,
                  LeaderboardService.name,
                );
                return of(null);
              }),
            );
        }
      }),
    );
  }

  private fetchMatches$(matchIds: string[]): Observable<MatchResponseDto[]> {
    return forkJoin(
      matchIds.map((matchId) =>
        this.fetchMatch$(matchId).pipe(filter((match) => !!match)),
      ),
    ).pipe(defaultIfEmpty([]));
  }

  private fetchMatch$(matchId: string): Observable<MatchResponseDto | null> {
    const url = `${PUBG_API_URL}/matches/${matchId}`;

    return from(
      this.cacheManager.get<MatchResponseDto>(`matches.${matchId}`),
    ).pipe(
      switchMap((cachedMatch) => {
        if (!!cachedMatch) {
          Logger.debug(
            `[CACHE HIT] matches.${matchId} [fetching from cache]`,
            LeaderboardService.name,
          );
          return of(cachedMatch);
        } else
          return this.httpService
            .get<MatchResponseDto>(url, {
              headers: {
                Accept: PUBG_ACCEPT_HEADER,
              },
            })
            .pipe(
              filter((response) => !!response?.data?.data),
              map((response) => response.data),
              tap(async (data) => {
                Logger.debug(
                  `[CACHE MISS] matches.${matchId} [fetching from API]`,
                  LeaderboardService.name,
                );
                await this.cacheManager.set(
                  `matches.${matchId}`,
                  data,
                  MS_TIME.WEEK * 10,
                );
              }),
              catchError((error: AxiosError) => {
                Logger.error(
                  error.message,
                  error.stack,
                  LeaderboardService.name,
                );
                return of(null);
              }),
            );
      }),
    );
  }

  private getAvailablePlayers(): string[] {
    return this.configService.getOrThrow<string>('PUBG_PLAYERS').split(',');
  }
}
