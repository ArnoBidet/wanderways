import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameModeMetaDataService } from 'src/app/shared/services/game-mode-specific/game-mode-meta-data.service';
import { Game } from 'src/app/shared/utils/abstract/game.abstract';

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.component.html',
  styleUrls: ['./consultation.component.scss']
})
export class ConsultationComponent extends Game implements OnInit {

  constructor(protected route: ActivatedRoute,
    protected router: Router,
    protected gameModeMetaDataService : GameModeMetaDataService) {
    super(route, router,  gameModeMetaDataService);
  }

  ngOnInit(): void {
  }
  bindGameStatus(): void {
    throw new Error('Method not implemented.');
  }
  onStart(): void {
    throw new Error('Method not implemented.');
  }
  onPlaying(): void {
    throw new Error('Method not implemented.');
  }
  onPause(): void {
    throw new Error('Method not implemented.');
  }
  onWon(): void {
    throw new Error('Method not implemented.');
  }
  onLost(): void {
    throw new Error('Method not implemented.');
  }
  onError(): void {
    throw new Error('Method not implemented.');
  }
}
