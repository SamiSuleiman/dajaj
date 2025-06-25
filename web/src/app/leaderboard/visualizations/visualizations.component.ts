import { Component, input } from '@angular/core';
import { PlayerMatchStatsDto, PlayerStatsDto } from '../leaderboard.model';
import { BarComponent } from './charts/bar.component';
import { PieComponent } from './charts/pie.component';
import { TableComponent } from './table.component';
import { Visualization } from './visualiztions.model';
import { LineComponent } from './charts/line.component';

@Component({
  template: `
    @if ($playerStats(); as playerStats) {
      @switch ($visualization()) {
        @case ('table') {
          <app-table [playerStats]="playerStats"></app-table>
        }
        @case ('bar') {
          <app-bar [playerStats]="playerStats"></app-bar>
        }
        @case ('pie') {
          <app-pie [playerStats]="playerStats"></app-pie>
        }
        @case ('line') {
          <app-line [playerMatchStats]="$playerMatchStats()"></app-line>
        }
      }
    } @else {
      <span> No data to display. </span>
    }
  `,
  imports: [TableComponent, BarComponent, PieComponent, LineComponent],
  selector: 'app-visualizations',
})
export class VisualizationsComponent {
  // TODO: we could just pass in the component instead.
  readonly $visualization = input.required<Visualization>({
    alias: 'visualization',
  });
  readonly $playerStats = input.required<PlayerStatsDto[]>({
    alias: 'playerStats',
  });
  readonly $playerMatchStats = input.required<PlayerMatchStatsDto[]>({
    alias: 'playerMatchStats',
  });
}
