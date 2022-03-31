import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MapIndexEntry } from '../services/map-index-loader/interfaces/map-index-entry.interface';
import { MapIndexLoaderService } from '../services/map-index-loader/map-index-loader.service';
import { MapSvgLoaderService } from '../services/map-svg-loader/map-svg-loader.service';
import { MapSvg } from '../services/map-svg-loader/maps_svg.interface';
import { pan, zoom, resetTransform, Coordinates } from './utils/index';

@Component({
  selector: 'app-map-generic',
  templateUrl: './map-generic.component.html',
  styleUrls: ['./map-generic.component.scss']
})
export class MapGenericComponent implements OnInit {
  @Input('colorSubdivision') colorSubdivision: boolean = false;

  @ViewChild('mapRef') mapRef: ElementRef<SVGSVGElement> | undefined;
  @ViewChild('groupRef') groupRef: ElementRef<SVGGElement> | undefined;

  loadedMap: MapSvg | undefined = undefined;

  currentSelectedNode: HTMLElement | undefined = undefined;

  mouseStates = {
    isPanned: false,
    isClickDown: false
  }

  /**
   * Represents the id of an interval. When launched, equals the id of the generated interval. When want to stop, then just clear the interval via its ID
   */
  scallingIntervalId: number | undefined = undefined;

  currentSelectedArea: string = "";

  /**
   * Allows to know the state of the map :Panned, scaled or else.
   * Should never be null.
   */
  private currentMatrix!: DOMMatrix;

  constructor(private route: ActivatedRoute, private mapIndexLoader: MapIndexLoaderService, private mapSvgLoaderService: MapSvgLoaderService) { }

  /**
   * On init, loads maps svg and related data
   * @TODO Make it catch error and allow "try reload" function
   */
  ngOnInit(): void {
    this.route.queryParams.subscribe(queryParameter => {
      if (!queryParameter) return; // If there is no value then skip

      this.mapIndexLoader.getEntryIfExists(queryParameter["map"]).then((mapIndexEntry: MapIndexEntry | undefined) => {
        if (!mapIndexEntry) return; // If no data found then skip
        this.loadMapSvg(mapIndexEntry);
      });
    })
  }

  /**
   * Loads the svg for a given map
   * @param mapIndexEntry The map index entry corresponding to the wanted svg
   */
  private loadMapSvg(mapIndexEntry: MapIndexEntry) {
    this.mapSvgLoaderService.getMapSvg(mapIndexEntry.relatedSvg).subscribe(svg => {
      this.loadedMap = svg;
      // Make it so transform matrix wait for the map to be fully generated by Ivy before effectively be created
      setTimeout(() => { this.resetTransform() })
    });
  }

  /**
   * On an area click, search on associated data list the corresponding identifier. Colors the area and its subdivision
   * @param event The mouse click event. We get the area node from it
   */
  areaClick(event: MouseEvent): void {
    if (!(<HTMLElement>event.target).classList.contains('land')) return;

    Array.from(document.getElementsByClassName("selected")).forEach(e => {
      (<HTMLElement>e).classList.remove('selected');
    })
    this.currentSelectedNode = (<HTMLElement>event.target);
    this.currentSelectedNode.classList.add('selected')

    if (true) {
      Array.from(document.getElementsByClassName("subdivision-selected")).forEach(e => {
        (<HTMLElement>e).classList.remove('subdivision-selected');
      })
      this.currentSelectedArea = this.currentSelectedNode.classList[0];
      this.colorAreas(this.currentSelectedArea);
    }

  }

  /**
   * Color selected subdivisions, but not the selected area
   * @param className The subdivisions to color
   */
  private colorAreas(className: string) {
    let elements: HTMLCollectionOf<Element> = document.getElementsByClassName(className);
    Array.from(elements).forEach(e => {
      if (this.currentSelectedNode!.id !== (<HTMLElement>e).id) {
        (<HTMLElement>e).classList.add("subdivision-selected");
      }
    })
  }

  /**
   * Sets current mousestates as `panning`
   * @param event 
   */
  panningBegin(event: MouseEvent) {
    if (event.button === 1 || !matchMedia('(pointer:fine)').matches) {
      this.mouseStates.isPanned = true;
    }
  }

  /**
   * Sets current mousestates as not `panning`
   * @param event 
   */
  panningEnd(event: MouseEvent) {
    if (event.button === 1 || !matchMedia('(pointer:fine)').matches) {
      this.mouseStates.isPanned = false;
    }
  }

  /**
   * Gives the deltas to apply on map to pan
   * @param mouseMove 
   */
  panningMove(mouseMove: MouseEvent) {
    if (this.mouseStates.isPanned) {
      this.pan({ x: mouseMove.movementX, y: mouseMove.movementY })
    }
  }

  /**
   * Apply the panning to the map
   * @param deltaCoordinates 
   */
  pan(deltaCoordinates: Coordinates) {
    this.currentMatrix = pan({
      currentTransform: this.currentMatrix,
      containerElement: this.mapRef!.nativeElement,
      toPanElement: this.groupRef!.nativeElement,
      deltaCoordinates: deltaCoordinates
    });
  }

  /**
   * Scalling with the wheel
   * @param event 
   */
  wheelEvent(event: WheelEvent) {
    console.log(event.x, event.y);

    event.preventDefault();
    let coordinates = {
      x: event.x,
      y: event.y
    };
    this.zoom(-event.deltaY, coordinates);
  }
  /**
   * Scalling in or out
   */
  scaleClick(zoomIn: boolean) {
    // If no current scalling loop, then do nothing
    if (!this.scallingIntervalId) {
      this.scallingIntervalId = window.setInterval(() => {
        let element: DOMRect = this.mapRef!.nativeElement.getBoundingClientRect();
        let coordinates = {
          x: element.width / 2 + element.x,
          y: element.height / 2 + element.y
        };
        this.zoom((zoomIn ? 1 : -1) * 100, coordinates);
      }, 50);
    }
  }

  /**
   * Stops the zoom loop
   */
  zoomStop() {
    clearInterval(this.scallingIntervalId!);
    this.scallingIntervalId = undefined;
  }

  /**
   * Reset the map to its initial state
   */
  resetTransform() {
    this.currentMatrix = this.mapRef!.nativeElement.createSVGMatrix();
    this.groupRef!.nativeElement.style.transform = "";
    resetTransform(this.mapRef!.nativeElement, this.groupRef!.nativeElement);
  }

  /**
   * Zooms in the map at the given coordinates for the given delta
   * @param scale A delta corresponding to the percentage to zoom (e.g : 0.8 or 1.2)
   * @param coordinates Some relative to a box coordinates to zoom to
   */
  zoom(scale: number, coordinates: { x: number, y: number }) {
    this.currentMatrix = zoom({
      deltaScale: scale,
      currentTransform: this.currentMatrix,
      containerElement: this.mapRef!.nativeElement,
      toScaleElement: this.groupRef!.nativeElement,
      coordinates: coordinates
    });
  }
}
