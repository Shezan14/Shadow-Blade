export class CampaignUI {
  constructor(root = document) {
    this.hud = root.querySelector('#campaign-hud');
    this.level = root.querySelector('#campaign-level');
    this.title = root.querySelector('#campaign-title');
    this.objective = root.querySelector('#campaign-objective');
    this.shards = root.querySelector('#campaign-shards');
    this.screen = root.querySelector('#campaign-screen');
    this.screenChapter = root.querySelector('#campaign-screen-chapter');
    this.screenTitle = root.querySelector('#campaign-screen-title');
    this.screenStory = root.querySelector('#campaign-screen-story');
    this.screenReward = root.querySelector('#campaign-screen-reward');
    this.actionButton = root.querySelector('#campaign-action');
    this.continueButton = root.querySelector('#continue-button');
  }

  bindAction(callback) {
    this.actionButton.addEventListener('click', callback);
  }

  setContinueAvailable(available) {
    this.continueButton.hidden = !available;
  }

  update(snapshot, active = true) {
    this.hud.classList.toggle('is-visible', active && snapshot.phase !== 'idle');
    this.level.textContent = `LEVEL ${String(snapshot.level).padStart(2, '0')} / ${String(snapshot.totalLevels).padStart(2, '0')}`;
    this.title.textContent = snapshot.title;
    this.objective.textContent = snapshot.objective;
    this.shards.textContent = `${snapshot.shards} / 4 SHARDS`;
  }

  showStory(snapshot, completed = false) {
    this.screenChapter.textContent = completed ? 'Chapter cleared' : snapshot.chapter;
    this.screenTitle.textContent = snapshot.title;
    this.screenStory.textContent = completed
      ? 'The portal has stabilized. The next fracture is now within reach.'
      : snapshot.story;
    this.screenReward.textContent = completed
      ? `Checkpoint secured · ${snapshot.shards} elemental shard${snapshot.shards === 1 ? '' : 's'}`
      : `Attuned element · ${snapshot.element}`;
    this.actionButton.textContent = completed ? 'Continue journey' : 'Enter chapter';
    this.screen.classList.add('is-visible');
  }

  hideStory() {
    this.screen.classList.remove('is-visible');
  }
}
