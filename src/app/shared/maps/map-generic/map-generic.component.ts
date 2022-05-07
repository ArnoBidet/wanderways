import { Component, ElementRef, Input, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AreaCommons } from '../services/map-data-loader/interfaces/areaCommons.interface';
import { MapDataLoaderService } from '../services/map-data-loader/map-data-loader.service';
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

  @Output('mapIndexEntryLoaded') mapIndexEntry: EventEmitter<MapIndexEntry> = new EventEmitter<MapIndexEntry>();
  @Output('areaSelected') areaSelected: EventEmitter<AreaCommons> = new EventEmitter<AreaCommons>();

  @Input('colorGroup') colorGroup: boolean = false;

  @ViewChild('mapRef') mapRef: ElementRef<SVGSVGElement> | undefined;
  @ViewChild('groupRef') groupRef: ElementRef<SVGGElement> | undefined;

  loadedMap: MapSvg | undefined = undefined;
  loadedData: AreaCommons[] | undefined = undefined;

  currentSelected: AreaCommons | undefined = undefined;

  mouseStates: MouseStates = {
    isPanned: false,
    isClickDown: false,
    pointerDownEvents: []
  }

  /**
   * Represents the id of an interval. When launched, equals the id of the generated interval. When want to stop, then just clear the interval via its ID
   */
  scallingIntervalId: number | undefined = undefined;

  pinchingTimeoutId: number | undefined = undefined;

  currentSelectedArea: string = "";

  /**
   * Allows to know the state of the map :Panned, scaled or else.
   * Should never be null.
   */
  private currentMatrix!: DOMMatrix;

  constructor(private route: ActivatedRoute, private mapIndexLoader: MapIndexLoaderService, private mapSvgLoaderService: MapSvgLoaderService, private mapDataLoaderService: MapDataLoaderService) { }

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
        this.loadMapData(mapIndexEntry);
        this.mapIndexEntry.emit(mapIndexEntry);
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
  private loadMapData(mapIndexEntry: MapIndexEntry) {
    this.mapDataLoaderService.getMapMetaData(mapIndexEntry.mapIdentifier).subscribe(data => {
      this.loadedData = data;
    });
  }

  /**
   * On an area click, search on associated data list the corresponding identifier. Colors the area and its group
   * @param event The mouse click event. We get the area node from it
   */
  areaClick(event: MouseEvent, areaId: string): void {
    this.removeLandsColoration()
    this.currentSelected = this.loadedData!.find(e => e.identifier === areaId);
    if (!this.currentSelected) return;
    document.getElementById(areaId)!.classList.add('selected');
    this.colorAreas(this.currentSelected!.group);
    this.areaSelected.emit(this.currentSelected);
  }

  removeLandsColoration() {
    Array.from(document.getElementsByClassName("selected")).forEach(e => {
      (<HTMLElement>e).classList.remove('selected');
    });

    Array.from(document.getElementsByClassName("group-selected")).forEach(e => {
      (<HTMLElement>e).classList.remove('group-selected');
    });
  }

  /**
   * Color selected group, but not the selected area
   * @param className The group to color
   */
  private colorAreas(className: string) {
    let elements: HTMLCollectionOf<Element> = document.getElementsByClassName(className);
    Array.from(elements).forEach(e => {
      if (this.currentSelected!.identifier !== (<HTMLElement>e).id) {
        (<HTMLElement>e).classList.add("group-selected");
      }
    })
  }

  /**
   * Sets current mousestates as `panning`
   * @param event 
   */
  panningBegin(event: MouseEvent) {
    if (event instanceof PointerEvent) {
      this.mouseStates.pointerDownEvents.push(event);
    }

    if (event.button === 1 || !matchMedia('(pointer:fine)').matches) {
      this.mouseStates.isPanned = true;
    }
  }

  /**
   * Sets current mousestates as not `panning`
   * @param event 
   */
  panningEnd(event: MouseEvent) {
    if (event instanceof PointerEvent) {
      this.mouseStates.pointerDownEvents = this.mouseStates.pointerDownEvents.filter(e => e.pointerId !== event.pointerId);
    }
    if (event.button === 1 || !matchMedia('(pointer:fine)').matches) {
      this.mouseStates.isPanned = false;
    }
  }

  /**
   * Apply correct transform on map depending on : If on mobile, if pinching, if middle click
   * @param mouseMove A mouseMove event that may be of type PointerEvent (case of mobile)
   */
  pointerMove(mouseMove: MouseEvent) {
    // If on mobile device
    if (mouseMove instanceof PointerEvent) {
      // Find this event in the cache and update its record with this event
      this.mouseStates.pointerDownEvents[this.mouseStates.pointerDownEvents.findIndex(e => mouseMove.pointerId == e.pointerId)] = mouseMove;
    }
    // If two pointer at a time, then check if should try to zoom
    if (this.mouseStates.pointerDownEvents.length == 2) {
      if (!this.pinchingTimeoutId) {
        // Set a timeout to debounce pinch event that can trigger many events at a time
        this.pinchingTimeoutId = window.setTimeout(() => { this.pinchingTimeoutId = undefined }, 50);
        let firstPointer  = this.mouseStates.pointerDownEvents[0],
            secondPointer = this.mouseStates.pointerDownEvents[1];
        // Origin distance between pointers
        let originDist = Math.sqrt((firstPointer.x - secondPointer.x)**2
                                +  (firstPointer.y - secondPointer.y)**2);
        // Distance between pointers after mov
        let newDist = Math.sqrt(((firstPointer.x + firstPointer.movementX) - (secondPointer.x + secondPointer.movementX))**2
                                +  ((firstPointer.y + firstPointer.movementY) - (secondPointer.y + secondPointer.movementY))**2);
        // this.snapDiff = (curDiff)/window.devicePixelRatio;
        this.zoom((newDist - originDist)/window.devicePixelRatio * 15, { x: (secondPointer.clientX + firstPointer.clientX) / 2, y: (secondPointer.clientY + firstPointer.clientY) / 2 });
       
      }
    } else if (this.mouseStates.pointerDownEvents.length == 1) {
      this.panning(mouseMove);
    }
  }

  /**
   * Gives the deltas to apply on map to pan
   * @param mouseMove 
   */
  panning(mouseMove: MouseEvent) {
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
    resetTransform(this.mapRef!.nativeElement, this.groupRef!.nativeElement);
    this.setLandWidth(this.currentMatrix.a);
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
    this.setLandWidth(this.currentMatrix.a);
  }

  /**
   * Adapt the land stroke to the current scale
   * @param scale A scale to adapt to
   */
  setLandWidth(scale: number) {
    document.documentElement.style.setProperty('--land-stroke', (0.4 / scale) + "px");
  }
}


interface MouseStates {
  isPanned: boolean,
  isClickDown: boolean,
  pointerDownEvents: PointerEvent[]
}