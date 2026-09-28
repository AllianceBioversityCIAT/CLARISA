import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsageChartComponent } from './usage-chart.component';
import { SparklineComponent } from './sparkline.component';
import { FlowChartComponent } from './flow-chart.component';

/**
 * The panel's own SVG charts (area/line, sparkline, flow), shared by every admin
 * module that shows usage: Microservices & API keys and Global Concepts.
 */
@NgModule({
  declarations: [UsageChartComponent, SparklineComponent, FlowChartComponent],
  imports: [CommonModule],
  exports: [UsageChartComponent, SparklineComponent, FlowChartComponent]
})
export class AdminChartsModule {}
