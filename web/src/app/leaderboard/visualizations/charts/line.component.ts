import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { PlayerMatchStatsDto, Stats } from '../../leaderboard.model';
import { VisualiztionsService } from '../visualiztions.service';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoDirective } from '@jsverse/transloco';
import { BaseChartDirective } from 'ng2-charts';
import { startWith, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';

@Component({
  template: `
    <ng-container *transloco="let t">
      <div class="config__container">
        <mat-form-field>
          <mat-label>{{ t('stat') }}</mat-label>
          <mat-select [formControl]="selectedStat">
            @for (stat of $statList(); track stat.value) {
              <mat-option [value]="stat.value">{{ stat.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <div class="chart__container">
        <div class="canvas__container">
          <canvas
            baseChart
            [options]="options"
            [data]="$datasets()"
            [type]="'line'"
          >
          </canvas>
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    .canvas__container {
      min-width: min-content;
      height: 100%;
    }

    .chart__container {
      overflow-x: auto;
    }
  `,
  providers: [DatePipe],
  imports: [
    BaseChartDirective,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    TranslocoDirective,
  ],
  selector: 'app-line',
})
export class LineComponent {
  private readonly visualizationsService = inject(VisualiztionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = inject(DatePipe);

  readonly $playerMatchStats = input.required<PlayerMatchStatsDto[]>({
    alias: 'playerMatchStats',
  });

  protected readonly $playerAndStatList = computed(() =>
    this.visualizationsService.$playerAndStatList(),
  );

  protected readonly $statList = computed(() =>
    this.visualizationsService.$statList(),
  );

  protected readonly selectedStat = new FormControl<keyof Stats>('kills');

  protected readonly $datasets = signal<any>(null);

  protected readonly options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        display: true,
        align: 'start' as any,
      },
    },
  };

  private readonly colors = this.visualizationsService.backgroundColors;

  constructor() {
    effect(() =>
      this.setDatasets(this.$playerMatchStats(), this.selectedStat.value),
    );
  }

  ngOnInit(): void {
    this.selectedStat.valueChanges
      .pipe(
        startWith(this.selectedStat.value),
        tap((selectedStat) =>
          this.setDatasets(this.$playerMatchStats(), selectedStat),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private setDatasets(
    playerStats: PlayerMatchStatsDto[],
    selectedStat?: keyof Stats | null,
  ) {
    const players = playerStats.map((player) => player.playerName);
    const playerMatchDates =
      playerStats
        .find((player) => !!player.matches)
        ?.matches.map(
          (match) => this.datePipe.transform(match.createdAt, 'medium') ?? '',
        )
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()) ?? [];

    this.$datasets.set({
      labels: playerMatchDates,
      datasets: players.map((player) => ({
        label: player,
        backgroundColor: this.colors[players.indexOf(player)],
        fill: true,
        tension: 0.4,
        data:
          playerStats
            .find((p) => p.playerName === player)
            ?.matches.sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            )
            .map((m) => m.stats[selectedStat ?? 'kills']) ?? [],
      })),
    });
  }
}
