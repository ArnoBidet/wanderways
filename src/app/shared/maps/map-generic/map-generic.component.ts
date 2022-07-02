import { Component, ElementRef, Input, OnInit, Output, EventEmitter, ViewChild, SimpleChanges } from '@angular/core';
import { AreaCommons } from '../services/map-data/interfaces/areaCommons.interface';
import { MapDataService } from '../services/map-data/map-data.service';
import { MapSvgService } from '../services/map-svg/map-svg.service';
import { MapSvg } from '../services/map-svg/interfaces/maps_svg.interface';
import { pan, zoom, resetTransform, Coordinates } from './utils/index';

@Component({
  selector: 'app-map-generic',
  templateUrl: './map-generic.component.html',
  styleUrls: ['./map-generic.component.scss']
})
export class MapGenericComponent implements OnInit {

  @Output('areaSelected') areaSelected: EventEmitter<AreaCommons> = new EventEmitter<AreaCommons>();

  @Input('colorGroup') colorGroup: boolean = false;

  @ViewChild('mapRef') mapRef: ElementRef<SVGSVGElement> | undefined;
  @ViewChild('groupRef') groupRef: ElementRef<SVGGElement> | undefined;

  @Input('mapIdentifier') mapIdentifier : string = ""; 

  loadedMap: MapSvg | undefined = undefined;
  loadedData: AreaCommons[] | undefined = undefined;

  currentSelected: AreaCommons | undefined = undefined;

  mouseStates: MouseStates = {
    isPanned: false,
    isClickDown: false,
    pointerDownEvents: [],
    lastX:0,
    lastY:0
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

  constructor( private mapSvgService: MapSvgService, private mapDataService: MapDataService) { }

  /**
   * On init, 
   */
  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges) {
    if(changes.mapIdentifier) this.onMapIdentifierChange(changes.mapIdentifier.currentValue);
  }

  /**
   * Loads maps svg and related data
   */
  onMapIdentifierChange(mapIdentifier : string){
    if (!mapIdentifier) return; // If there is no value then skip
      this.loadMapSvg(mapIdentifier);
      this.loadMapData(mapIdentifier);
  }


  /**
   * Loads the svg for a given map
   * @param mapIdentifier The map index entry corresponding to the wanted svg
   */
  private loadMapSvg(mapIdentifier: string) {
    
    this.mapSvgService.getMapSvg(mapIdentifier).subscribe(svg => {
      this.loadedMap = svg;
      // Make it so transform matrix wait for the map to be fully generated by Ivy before effectively be created
      setTimeout(() => { this.resetTransform(); }, 100);
    });
  }
  private loadMapData(mapIdentifier: string) {
    this.mapDataService.getMapMetaData(mapIdentifier).subscribe(data => {
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
      event.preventDefault();
      this.mouseStates.isPanned = true;
    }
  }

  /**
   * Sets current mousestates as not `panning`
   * @param event 
   */
  panningEnd(event: MouseEvent) {
    this.mouseStates.lastX = 0;
    this.mouseStates.lastY = 0;
    if (event instanceof PointerEvent) {
      this.mouseStates.pointerDownEvents = this.mouseStates.pointerDownEvents.filter(e => e.pointerId !== event.pointerId);
    }
    if (event.button === 1 || !matchMedia('(pointer:fine)').matches) {
      event.preventDefault();
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
        let originDist = Math.sqrt((firstPointer.clientX - secondPointer.clientX)**2
                                +  (firstPointer.clientY- secondPointer.clientY)**2);
        // Distance between pointers after mov
        let newDist = Math.sqrt(((firstPointer.x + firstPointer.movementX) - (secondPointer.x + secondPointer.movementX))**2
                                +  ((firstPointer.y + firstPointer.movementY) - (secondPointer.y + secondPointer.movementY))**2);
        this.zoom((newDist - originDist)/window.devicePixelRatio * 15, { x: (secondPointer.clientX + firstPointer.clientX) / 2, y: (secondPointer.clientY + firstPointer.clientY) / 2 });
      }
    } else if (this.mouseStates.pointerDownEvents.length == 1) {
      // if first move on panning, then do not move (else you'll get a X - 0 which makes the map take your thumb as origin)
      if(this.mouseStates.lastX !== 0 && this.mouseStates.lastY !== 0){
        
        mouseMove.preventDefault();
        this.panning(mouseMove.clientX - this.mouseStates.lastX, mouseMove.clientY - this.mouseStates.lastY);
      }
    }
    // Register last positions
    this.mouseStates.lastX = mouseMove.clientX;
    this.mouseStates.lastY = mouseMove.clientY;
  }

  /**
   * Gives the deltas to apply on map to pan
   * @param mouseMove 
   */
  panning(movementX:number, movementY:number) {
    if (this.mouseStates.isPanned) {
      this.pan({ x: movementX, y: movementY })
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
  pointerDownEvents: PointerEvent[],
  lastX : number,
  lastY : number
}