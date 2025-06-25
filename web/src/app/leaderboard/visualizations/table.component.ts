import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, viewChild } from '@angular/core';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { PlayerStatsDto } from '../leaderboard.model';
import { VisualiztionsService } from './visualiztions.service';

@Component({
  template: `
    <mat-table [dataSource]="$dataSource()" class="mat-elevation-z8" matSort>
      @for (col of $playerAndStatList(); track col.value) {
        <ng-container matColumnDef="{{ col.value }}">
          <mat-header-cell *matHeaderCellDef mat-sort-header>{{
            col.label
          }}</mat-header-cell>
          <mat-cell *matCellDef="let element">{{
            format(element[col.value])
          }}</mat-cell>
        </ng-container>
      }
      <mat-header-row *matHeaderRowDef="$displayedColumns()"></mat-header-row>
      <mat-row *matRowDef="let row; columns: $displayedColumns()"></mat-row>
    </mat-table>
  `,
  styles: `
    .mat-column-playerName {
      border-right: 1px solid currentColor;
      padding-right: 100px;
      text-align: center;
    }
    mat-table {
      width: 100%;
      overflow: auto;
    }

    mat-header-row,
    mat-row,
    mat-header-cell,
    mat-cell {
      min-width: 100px;
    }
  `,
  imports: [MatTableModule, MatSortModule],
  providers: [DecimalPipe],
  selector: 'app-table',
})
export class TableComponent {
  private readonly visualizationsService = inject(VisualiztionsService);
  private readonly decimalPipe = inject(DecimalPipe);

  readonly $playerStats = input.required<PlayerStatsDto[]>({
    alias: 'playerStats',
  });

  protected readonly $dataSource = computed(() => {
    const sort = this.$sort();
    const dataSource = new MatTableDataSource(
      this.$playerStats().map((playerStats) => ({
        playerName: playerStats.playerName,
        ...playerStats.stats,
      })),
    );
    if (sort) dataSource.sort = sort;
    return dataSource;
  });

  private readonly $sort = viewChild(MatSort);

  protected readonly $playerAndStatList = computed(() =>
    this.visualizationsService.$playerAndStatList(),
  );

  protected readonly $displayedColumns = computed(() =>
    this.visualizationsService.$playerAndStatList()?.map((v) => v.value),
  );

  protected format(stat: any): string | number {
    return typeof stat === 'number'
      ? (this.decimalPipe.transform(stat, '1.0-0') ?? stat)
      : stat;
  }
}
