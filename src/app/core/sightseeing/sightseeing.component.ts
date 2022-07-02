import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { SelectGamemodeDialogComponent } from 'src/app/shared/components/dialogs/select-gamemode-dialog/select-gamemode-dialog.component';
import { AreaCommons } from 'src/app/shared/maps/services/map-data/interfaces/areaCommons.interface';
import { MapGroup } from 'src/app/shared/maps/services/map-group/interfaces/map-group.interface';
import { MapGroupService } from 'src/app/shared/maps/services/map-group/map-group.service';
import { Map } from 'src/app/shared/maps/services/map/interfaces/Map.interface';
import { MapService } from 'src/app/shared/maps/services/map/map.service';

import { HeaderDisplayService } from 'src/app/shared/services/header-display.service';

@Component({
  selector: 'app-sightseeing',
  templateUrl: './sightseeing.component.html',
  styleUrls: ['./sightseeing.component.scss']
})
export class SightseeingComponent implements OnInit {

  mapGroup: MapGroup | undefined = undefined;
  maps: Map[] = [];
  areaSelected: AreaCommons | undefined = undefined;

  selectedMap: Map | undefined;


  constructor(public dialog: MatDialog,
    private mapGroupService: MapGroupService,
    private mapService: MapService,
    private headerDisplayService: HeaderDisplayService,
    private route: ActivatedRoute,
    private router: Router) { }

  ngOnInit(): void {
    setTimeout(() => this.headerDisplayService.setPosition("relative"));

    this.route.queryParams.subscribe(queryParameter => {
      if (!queryParameter) return; // If there is no value then skip

      this.mapGroupService.getEntryIfExists(queryParameter["map"]).then((mapGroup: MapGroup | undefined) => {        
        if (!mapGroup) return; // If no data found then skip
        this.mapGroup = mapGroup;
        this.mapService.getMapsFromGroup(this.mapGroup.mapGroupidentifier).then(e=> {
          this.maps = e;
          this.selectedMap = this.maps[0];
        });
      });
    })
  }

  setSelectedMap(mapIdentifier: string) {
    this.selectedMap = this.maps.find(e => e.identifier === mapIdentifier);
  }

  ngOnDestroy(): void {
    this.headerDisplayService.setPosition("sticky");
  }

  /**
   * When map is loaded, get its entry to display basic info
   * @param mapGroup A map index entry
   */
  onMapGroup(mapGroup: MapGroup) {
    this.mapGroup = mapGroup;
  }

  /**
   * When an area is selected, get its data an display informations
   * @param areaCommons An area data
   */
  onAreaSelected(areaCommons: AreaCommons) {
    this.areaSelected = areaCommons;
  }

  onPlay() {
    this.openDialog();

  }

  openDialog(): void {
    this.dialog.open(SelectGamemodeDialogComponent, {
      minWidth:'50vw',
      data: { selectedMap: this.selectedMap, mapGroup: this.mapGroup }
    }).afterClosed().subscribe((data?: { mapIdentifier: string, gameIdentifier: string }) => {
      if (data) {
        this.router.navigate(["/game/" + data.gameIdentifier], { queryParams: { mapIdentifier: data.mapIdentifier } })
      }
    });
  }
}
