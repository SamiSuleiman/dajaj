import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { combineLatest, filter, forkJoin, Observable, switchMap, take, tap } from 'rxjs';
import { PlayerMatchStatsDto, PlayerStatsDto } from './leaderboard.model';
import { LeaderboardService } from './leaderboard.service';
import { VisualizationsComponent } from './visualizations/visualizations.component';
import { Visualization, visualizations } from './visualizations/visualiztions.model';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';

@Component({
  template: `
    <ng-container *transloco="let t">
      <div>
        <div class="config__container">
          <mat-form-field>
            <mat-label>{{ t('visualization.label') }}</mat-label>
            <mat-select [formControl]="visualiztion">
              @for (vis of visualizations; track vis) {
                <mat-option [value]="vis">{{ t('visualization.charts.' + vis) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <div class="config__username-select">
            <mat-form-field>
              <mat-label>{{ t('usernames.label') }}</mat-label>
              <mat-select [formControl]="usernames" multiple>
                @for (username of $validUsernames(); track username) {
                  <mat-option [value]="username">{{ username }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-icon-button (click)="onRefresh()">
              <mat-icon>refresh</mat-icon>
            </button>
            <!-- "earliest": "The earliest recorded match was on",
            "matchCount": "The data was collected from",
            "matches": "Matches", -->
          </div>
        </div>
        @if ($playerStats(); as stats) {
          <app-visualizations
            [visualization]="visualiztion.value!"
            [playerStats]="stats"
            [playerMatchStats]="$playerMatchStats()"
          ></app-visualizations>
          <i class="data__info">
            {{ t('visualization.matchCount') }} {{ stats[0].matchCount }} {{ t('visualization.matches') }} ,
            {{ t('visualization.earliest') }} {{ stats[0].earliestMatchDate | date: 'medium' }}
          </i>
        }
      </div>
    </ng-container>
  `,
  styles: `
    .data__info {
      margin: 10px;
      font-size: 14px;
    }

    .config__username-select {
      display: flex;
      justify-content: start;
      align-items: center;
    }
  `,
  imports: [
    DatePipe,
    VisualizationsComponent,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatIcon,
    MatIconButton,
    TranslocoDirective,
  ],
  providers: [LeaderboardService],
  selector: 'app-leaderboard',
})
export class LeaderboardComponent {
  private readonly leaderboardService = inject(LeaderboardService);
  protected readonly visualizations = visualizations;
  protected readonly $playerStats = signal<PlayerStatsDto[]>([]);
  protected readonly $playerMatchStats = signal<PlayerMatchStatsDto[]>([]);
  protected readonly $validUsernames = toSignal(
    this.leaderboardService.getValidPlayers$().pipe(tap((usernames) => this.usernames.setValue(usernames))),
  );

  protected readonly usernames = new FormControl<string[]>([]);
  protected readonly visualiztion = new FormControl<Visualization>('table', {
    validators: [Validators.required],
  });

  constructor() {
    this.usernames.valueChanges
      .pipe(
        filter((usernames) => !!usernames),
        switchMap((usernames) => {
          return forkJoin([this.getPlayerStats$(usernames, false), this.getPlayerMatchStats$(usernames, false)]);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected onRefresh(): void {
    combineLatest([
      this.getPlayerStats$(this.usernames.value ?? [], true),
      this.getPlayerMatchStats$(this.usernames.value ?? [], true),
    ]).subscribe();
  }

  protected getPlayerMatchStats$(usernames: string[], doRefresh = false): Observable<PlayerMatchStatsDto[]> {
    return this.leaderboardService.getPlayersMatchStats$(usernames, doRefresh).pipe(
      tap((playerMatchStats) => this.$playerMatchStats.set(playerMatchStats)),
      take(1),
    );
  }

  protected getPlayerStats$(usernames: string[], doRefresh = false): Observable<PlayerStatsDto[]> {
    return this.leaderboardService.getLeaderboard$(usernames, doRefresh).pipe(
      tap((playerStats) => this.$playerStats.set(playerStats)),
      take(1),
    );
  }
}
